from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Trip
from schemas import TripCreate, TripOut
from auth_utils import decode_access_token
from fastapi.security import OAuth2PasswordBearer
from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()

router = APIRouter(prefix="/trips", tags=["Trips"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ─── Helper: get current user from token ────────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


# ─── Generate itinerary with Groq ───────────────────────
def generate_itinerary(destination: str, num_days: int, budget: str, interests: str):

    if budget == "budget":
        hotel_instruction = """
        Provide exactly 5 budget-friendly hotels (category: "budget").
        These should be affordable hostels, guesthouses, or cheap hotels under $80/night.
        Do NOT include moderate or luxury hotels.
        """
    elif budget == "moderate":
        hotel_instruction = """
        Provide exactly 5 moderate hotels (category: "moderate").
        These should be comfortable 3-4 star hotels between $80-$200/night.
        Do NOT include budget or luxury hotels.
        """
    else:
        hotel_instruction = """
        Provide exactly 5 luxury hotels (category: "luxury").
        These should be premium 5-star hotels or resorts above $200/night.
        Do NOT include budget or moderate hotels.
        """

    prompt = f"""
    Create a detailed {num_days}-day travel itinerary specifically for {destination}.
    The destination is exactly "{destination}" - use this full name to identify the correct city including the correct state and country.
    Do NOT confuse this with any other city of the same name in a different region.
    Budget: {budget}
    Interests: {interests}

    {hotel_instruction}

    Return ONLY a valid JSON object with this exact structure, no extra text:
    {{
        "days": [
            {{
                "day": 1,
                "title": "Day title",
                "places": [
                    {{
                        "name": "Place name",
                        "time": "9:00 AM",
                        "description": "Brief description",
                        "lat": 0.0000,
                        "lng": 0.0000,
                        "estimated_cost": "$20"
                    }}
                ]
            }}
        ],
        "hotels": [
            {{
                "name": "Hotel name",
                "description": "Brief description of the hotel",
                "price_per_night": "$100",
                "rating": "4.5/5",
                "location": "Area/neighborhood name",
                "category": "{budget}"
            }}
        ],
        "total_estimated_cost": "$500",
        "tips": ["tip1", "tip2", "tip3"]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    content = response.choices[0].message.content

    # Clean and parse JSON
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    return json.loads(content)

def generate_packing_list(destination: str, num_days: int, budget: str, interests: str, weather: str = ""):
    prompt = f"""
    Generate a smart packing list for a {num_days}-day trip to {destination}.
    Budget: {budget}
    Interests: {interests}
    {f"Current weather: {weather}" if weather else ""}

    Return ONLY a valid JSON object with this exact structure, no extra text:
    {{
        "categories": [
            {{
                "name": "Clothing",
                "emoji": "👕",
                "items": ["item1", "item2", "item3"]
            }},
            {{
                "name": "Toiletries",
                "emoji": "🧴",
                "items": ["item1", "item2"]
            }},
            {{
                "name": "Electronics",
                "emoji": "📱",
                "items": ["item1", "item2"]
            }},
            {{
                "name": "Documents",
                "emoji": "📄",
                "items": ["item1", "item2"]
            }},
            {{
                "name": "Health & Safety",
                "emoji": "💊",
                "items": ["item1", "item2"]
            }},
            {{
                "name": "Activity Specific",
                "emoji": "🎒",
                "items": ["item1", "item2"]
            }}
        ]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    content = response.choices[0].message.content
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()
    return json.loads(content)

def generate_trip_suggestions(trips_data: list):
    if not trips_data:
        return []

    trips_summary = "\n".join([
        f"- {t['destination']} ({t['num_days']} days, {t['budget']} budget, interests: {t['interests']})"
        for t in trips_data
    ])

    prompt = f"""
    Based on this user's travel history:
    {trips_summary}

    Suggest exactly 3 new travel destinations they would love.
    Consider their budget preferences, interests and past destinations.

    Return ONLY a valid JSON object with this exact structure, no extra text:
    {{
        "suggestions": [
            {{
                "destination": "City, Country",
                "reason": "Why this matches their travel style in 1-2 sentences",
                "estimated_budget": "budget/moderate/luxury",
                "best_time": "Best months to visit",
                "highlights": ["highlight1", "highlight2", "highlight3"]
            }}
        ]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    content = response.choices[0].message.content
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()
    return json.loads(content).get("suggestions", [])

# ─── Routes ─────────────────────────────────────────────

@router.post("/generate", response_model=TripOut)
def generate_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    itinerary = generate_itinerary(
        trip_data.destination,
        trip_data.num_days,
        trip_data.budget,
        trip_data.interests
    )

    new_trip = Trip(
        user_id=current_user.id,
        destination=trip_data.destination,
        num_days=trip_data.num_days,
        budget=trip_data.budget,
        interests=trip_data.interests,
        itinerary=itinerary
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip


@router.get("/", response_model=list[TripOut])
def get_all_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Trip).filter(Trip.user_id == current_user.id).all()


@router.get("/share/{share_token}", response_model=TripOut)
def get_shared_trip(share_token: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.share_token == share_token).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.put("/{trip_id}/regenerate", response_model=TripOut)
def regenerate_trip(
    trip_id: int,
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    itinerary = generate_itinerary(
        trip_data.destination,
        trip_data.num_days,
        trip_data.budget,
        trip_data.interests
    )

    trip.destination = trip_data.destination
    trip.num_days = trip_data.num_days
    trip.budget = trip_data.budget
    trip.interests = trip_data.interests
    trip.itinerary = itinerary

    db.commit()
    db.refresh(trip)
    return trip

@router.post("/{trip_id}/packing-list")
def get_packing_list(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    packing_list = generate_packing_list(
        trip.destination,
        trip.num_days,
        trip.budget,
        trip.interests
    )
    return packing_list
    
@router.delete("/{trip_id}")
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}

@router.get("/suggestions/ai", response_model=None)
def get_trip_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).all()
    if len(trips) < 2:
        return {"suggestions": [], "message": "Create at least 2 trips to get AI suggestions"}

    trips_data = [
        {
            "destination": t.destination,
            "num_days": t.num_days,
            "budget": t.budget,
            "interests": t.interests
        }
        for t in trips
    ]

    suggestions = generate_trip_suggestions(trips_data)
    return {"suggestions": suggestions}