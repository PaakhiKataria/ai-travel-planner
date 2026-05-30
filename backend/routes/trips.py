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
import resend

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

def send_itinerary_email(email: str, trip_data):
    resend.api_key = os.getenv("RESEND_API_KEY")

    days_html = ""
    for day in trip_data.itinerary.get("days", []):
        places_html = ""
        for place in day.get("places", []):
            places_html += f"""
                <div style="margin-bottom:16px; padding:14px; border:1px solid #eee; border-radius:8px;">
                    <div style="color:#667eea; font-weight:bold; font-size:13px;">{place.get('time', '')}</div>
                    <h3 style="margin:6px 0 4px; color:#333;">{place.get('name', '')}</h3>
                    <p style="margin:0 0 6px; color:#666; font-size:14px;">{place.get('description', '')}</p>
                    <p style="margin:0; color:#555; font-size:13px;">💰 {place.get('estimated_cost', '')}</p>
                </div>
            """
        days_html += f"""
            <div style="margin-bottom:24px;">
                <h2 style="color:#667eea; border-bottom:2px solid #667eea; padding-bottom:8px;">
                    Day {day.get('day')} — {day.get('title', '')}
                </h2>
                {places_html}
            </div>
        """

    tips_html = ""
    if trip_data.itinerary.get("tips"):
        tips_items = "".join([f"<li style='margin-bottom:6px; color:#555;'>{tip}</li>" for tip in trip_data.itinerary["tips"]])
        tips_html = f"""
            <div style="background:#fffbea; border:1px solid #fde68a; border-radius:8px; padding:16px; margin-top:24px;">
                <h3 style="margin:0 0 12px; color:#333;">💡 Travel Tips</h3>
                <ul style="margin:0; padding-left:20px;">{tips_items}</ul>
            </div>
        """

    html_content = f"""
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2); padding:32px; border-radius:16px 16px 0 0; text-align:center;">
                <h1 style="color:white; margin:0; font-size:28px;">✈️ Your Travel Itinerary</h1>
                <p style="color:rgba(255,255,255,0.9); margin:8px 0 0; font-size:16px;">{trip_data.destination}</p>
            </div>
            <div style="background:white; padding:32px; border-radius:0 0 16px 16px; border:1px solid #eee;">
                <div style="background:#f7f8fc; border-radius:8px; padding:16px; margin-bottom:24px;">
                    <p style="margin:0; color:#555;">📅 <strong>{trip_data.num_days} days</strong> &nbsp;|&nbsp;
                    💳 <strong>{trip_data.budget} budget</strong> &nbsp;|&nbsp;
                    🎯 <strong>{trip_data.interests}</strong></p>
                    <p style="margin:8px 0 0; color:#555;">💰 Total estimated cost: <strong>{trip_data.itinerary.get('total_estimated_cost', 'N/A')}</strong></p>
                </div>
                {days_html}
                {tips_html}
                <div style="text-align:center; margin-top:32px; padding-top:24px; border-top:1px solid #eee;">
                    <p style="color:#999; font-size:13px;">Sent from AI Travel Planner</p>
                </div>
            </div>
        </div>
    """

    resend.Emails.send({
        "from": "AI Travel Planner <onboarding@resend.dev>",
        "to": [email],
        "subject": f"✈️ Your {trip_data.destination} Itinerary",
        "html": html_content,
    })

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

@router.post("/{trip_id}/send-email")
def email_itinerary(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    try:
        send_itinerary_email(current_user.email, trip)
        return {"message": "Itinerary sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

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