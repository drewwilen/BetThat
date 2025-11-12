#!/usr/bin/env python3
"""
Script to generate synthetic demo data for BetThat platform.
Creates markets, votes, chat messages, and orders for demonstration purposes.
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal
import random
import secrets

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.user import User
from app.models.community import Community, CommunityMember
from app.models.market import Market, MarketStatus, MarketType
from app.models.market_outcome import MarketOutcome, OutcomeStatus
from app.models.market_vote import MarketVote
from app.models.market_message import MarketMessage
from app.models.order import Order, OrderSide, OrderType, OrderStatus
from app.core.security import get_password_hash

# Demo data templates - Fun markets people would actually bet on!
DEMO_MARKETS = [
    {
        "title": "Will our friend group have a group chat argument this week?",
        "description": "You know how it goes... someone's bound to start something. Will drama hit the group chat?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800",
    },
    {
        "title": "Who will get engaged first in our friend group?",
        "description": "The race is on! Which couple will take the next step?",
        "outcomes": ["Sarah & Mike", "Emma & Jake", "Alex & Taylor", "Someone else"],
        "outcome_images": {
            "Sarah & Mike": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400",
            "Emma & Jake": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400",
            "Alex & Taylor": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400",
            "Someone else": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800",
    },
    {
        "title": "Will it snow on campus before finals week?",
        "description": "Everyone's hoping for a snow day. Will Mother Nature deliver?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1551524164-6cf77f32e95e?w=800",
    },
    {
        "title": "Which dorm will win the intramural basketball championship?",
        "description": "The annual dorm tournament is heating up. Who's taking home the trophy?",
        "outcomes": ["West Hall", "East Tower", "North Commons", "South Quad"],
        "outcome_images": {
            "West Hall": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "East Tower": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "North Commons": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "South Quad": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    },
    {
        "title": "Will someone order pizza after midnight tonight?",
        "description": "Late night cravings are real. Will someone cave and order that 2am pizza?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    },
    {
        "title": "Who will be the first to break their New Year's resolution?",
        "description": "We all know someone's going to slip up first. Who's it gonna be?",
        "outcomes": ["Alex", "Jordan", "Sam", "Taylor", "Everyone (by Jan 2nd)"],
        "outcome_images": {
            "Alex": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
            "Jordan": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
            "Sam": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
            "Taylor": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
            "Everyone (by Jan 2nd)": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
    },
    {
        "title": "Will the dining hall serve chicken tenders this week?",
        "description": "The only good food on campus. Will they bless us with tenders?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800",
    },
    {
        "title": "Which team will win March Madness?",
        "description": "Bracket season is here! Who's your pick to cut down the nets?",
        "outcomes": ["Duke", "UNC", "Kansas", "Kentucky", "UConn", "Dark Horse"],
        "outcome_images": {
            "Duke": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "UNC": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "Kansas": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "Kentucky": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "UConn": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            "Dark Horse": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    },
    {
        "title": "Will someone show up late to the party tonight?",
        "description": "You know who you are. Will someone be fashionably late (or just late)?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    },
    {
        "title": "Who will win the Bachelor/Bachelorette this season?",
        "description": "The drama is real. Who's getting that final rose?",
        "outcomes": ["Contestant A", "Contestant B", "Contestant C", "Surprise winner"],
        "outcome_images": {
            "Contestant A": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
            "Contestant B": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
            "Contestant C": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
            "Surprise winner": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    },
    {
        "title": "Will someone pull an all-nighter before the exam?",
        "description": "Procrastination is real. Will someone be cramming at 3am?",
        "outcomes": ["default"],
        "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    },
    {
        "title": "Which friend will get the most likes on their Instagram post?",
        "description": "The social media competition is fierce. Who's getting the most love?",
        "outcomes": ["Alex", "Jordan", "Sam", "Taylor"],
        "outcome_images": {
            "Alex": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
            "Jordan": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
            "Sam": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
            "Taylor": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
        },
        "image_url": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
    },
]

DEMO_CHAT_MESSAGES = [
    "This is going to be huge! 🚀",
    "I'm betting big on this one",
    "What's everyone's take on this?",
    "The odds look good right now",
    "I think this is a safe bet",
    "Anyone else seeing this trend?",
    "This market is heating up!",
    "I'm in for the long haul",
    "Great analysis in the comments",
    "The data looks promising",
    "I'm skeptical but intrigued",
    "This could go either way",
    "Let's see how this plays out",
    "I'm bullish on this one",
    "The market sentiment is strong",
    "What's the consensus here?",
    "I'm waiting for more data",
    "This is a no-brainer for me",
    "The timing seems perfect",
    "I'm cautiously optimistic",
    "100% happening, no doubt",
    "I've got insider info on this 😏",
    "This is free money",
    "Y'all are sleeping on this",
    "I'm going all in",
    "This is way too obvious",
    "Someone's about to get rich",
    "The vibes are immaculate",
    "I'm feeling lucky today",
    "This is my lock of the week",
    "Can't believe the odds on this",
    "Easy money right here",
    "I'm calling it now",
    "This is going to age well",
    "Trust me on this one",
]

DEMO_USERNAMES = [
    "Alex", "Jordan", "Sam", "Taylor", "Casey",
    "Riley", "Morgan", "Quinn", "Avery", "Cameron",
    "Drew", "Jamie", "Sage", "River", "Skyler",
]


def get_or_create_demo_users(db: Session) -> list[User]:
    """Get or create demo users"""
    users = []
    for username in DEMO_USERNAMES:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                email=f"{username.lower()}@demo.com",
                username=username,
                password_hash=get_password_hash("demo123"),
                token_balance=Decimal("10000.00"),
            )
            db.add(user)
            db.flush()
        users.append(user)
    return users


def generate_invite_code() -> str:
    """Generate a unique invite code"""
    return secrets.token_urlsafe(8).upper()


def get_or_create_demo_community(db: Session, admin_user: User) -> Community:
    """Get or create demo community"""
    community = db.query(Community).filter(Community.name == "Demo Community").first()
    if not community:
        # Generate unique invite code
        invite_code = generate_invite_code()
        while db.query(Community).filter(Community.invite_code == invite_code).first():
            invite_code = generate_invite_code()
        
        community = Community(
            name="Demo Community",
            description="A community for demo purposes with exciting markets to trade",
            admin_id=admin_user.id,
            invite_code=invite_code,
            is_public=True,
            image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
        )
        db.add(community)
        db.flush()
        
        # Add creator as admin member
        admin_membership = CommunityMember(
            community_id=community.id,
            user_id=admin_user.id,
            role="admin",
        )
        db.add(admin_membership)
        
        # Add all demo users as members
        users = db.query(User).all()
        for user in users:
            # Skip if already added as admin
            if user.id == admin_user.id:
                continue
            membership = CommunityMember(
                community_id=community.id,
                user_id=user.id,
                role="member",
            )
            db.add(membership)
    
    return community


def create_markets(db: Session, community: Community, users: list[User]):
    """Create demo markets"""
    markets = []
    for i, market_data in enumerate(DEMO_MARKETS):
        # Random creator
        creator = random.choice(users)
        
        # Random deadline (1-30 days from now)
        deadline = datetime.utcnow() + timedelta(days=random.randint(1, 30))
        
        market = Market(
            community_id=community.id,
            creator_id=creator.id,
            title=market_data["title"],
            description=market_data["description"],
            market_type=MarketType.YES_NO if len(market_data["outcomes"]) == 1 else MarketType.MULTIPLE_CHOICE,
            resolution_deadline=deadline,
            status=MarketStatus.ACTIVE,
            outcomes=market_data["outcomes"],
            image_url=market_data.get("image_url"),
        )
        db.add(market)
        db.flush()
        
        # Create MarketOutcome entries
        outcome_images = market_data.get("outcome_images", {})
        for outcome_name in market_data["outcomes"]:
            outcome = MarketOutcome(
                market_id=market.id,
                name=outcome_name if outcome_name != "default" else "default",
                status=OutcomeStatus.ACTIVE,
                image_url=outcome_images.get(outcome_name),
            )
            db.add(outcome)
        
        markets.append(market)
        db.flush()
    
    return markets


def add_votes(db: Session, markets: list[Market], users: list[User]):
    """Add votes to markets"""
    for market in markets:
        # Random number of voters (5-15 per market)
        num_voters = random.randint(5, 15)
        voters = random.sample(users, min(num_voters, len(users)))
        
        for voter in voters:
            # Check if user already voted on this market
            existing_vote = db.query(MarketVote).filter(
                MarketVote.market_id == market.id,
                MarketVote.user_id == voter.id
            ).first()
            
            if existing_vote:
                continue  # Skip if already voted
            
            # 70% chance of upvote, 30% chance of downvote
            vote_type = "upvote" if random.random() < 0.7 else "downvote"
            
            vote = MarketVote(
                market_id=market.id,
                user_id=voter.id,
                vote_type=vote_type,
            )
            db.add(vote)
    
    db.flush()


def add_chat_messages(db: Session, markets: list[Market], users: list[User]):
    """Add chat messages to markets"""
    for market in markets:
        # Random number of messages (3-10 per market)
        num_messages = random.randint(3, 10)
        
        for i in range(num_messages):
            user = random.choice(users)
            message_text = random.choice(DEMO_CHAT_MESSAGES)
            
            # Create messages with time gaps
            created_at = datetime.utcnow() - timedelta(
                hours=random.randint(0, 48),
                minutes=random.randint(0, 59)
            )
            
            message = MarketMessage(
                market_id=market.id,
                user_id=user.id,
                message=message_text,
            )
            # Manually set created_at
            message.created_at = created_at
            db.add(message)
    
    db.flush()


def create_orders(db: Session, markets: list[Market], users: list[User]):
    """Create orders/bids for markets"""
    for market in markets:
        # Get outcomes for this market
        outcomes = market.outcomes if market.outcomes else ["default"]
        
        for outcome_name in outcomes:
            # Create orders for YES and NO
            for outcome_side in ["yes", "no"]:
                # Random number of orders (2-8 per outcome)
                num_orders = random.randint(2, 8)
                
                for _ in range(num_orders):
                    user = random.choice(users)
                    
                    # Random price between 0.1 and 0.9
                    price = Decimal(str(round(random.uniform(0.1, 0.9), 4)))
                    
                    # Random quantity (1-100 contracts)
                    quantity = Decimal(str(random.randint(1, 100)))
                    
                    # 80% limit orders, 20% market orders
                    order_type = OrderType.LIMIT if random.random() < 0.8 else OrderType.MARKET
                    
                    # Random status (mostly pending, some filled)
                    if random.random() < 0.3:
                        status = OrderStatus.FILLED
                        filled_quantity = quantity
                    else:
                        status = OrderStatus.PENDING
                        filled_quantity = Decimal("0")
                    
                    order = Order(
                        market_id=market.id,
                        user_id=user.id,
                        side=OrderSide.BUY,
                        outcome_name=outcome_name if outcome_name != "default" else "default",
                        outcome=outcome_side,
                        price=price,
                        quantity=quantity,
                        filled_quantity=filled_quantity,
                        order_type=order_type,
                        status=status,
                    )
                    db.add(order)
    
    db.flush()


def main():
    """Main function to generate all demo data"""
    db: Session = SessionLocal()
    
    try:
        print("🚀 Generating demo data...")
        
        # Get or create demo users
        print("👥 Creating demo users...")
        users = get_or_create_demo_users(db)
        print(f"   ✓ Created/found {len(users)} users")
        
        # Get or create demo community
        print("🏘️  Creating demo community...")
        admin_user = users[0] if users else None
        if not admin_user:
            print("   ✗ No users found!")
            return
        community = get_or_create_demo_community(db, admin_user)
        print(f"   ✓ Community: {community.name}")
        
        # Create markets
        print("📊 Creating markets...")
        markets = create_markets(db, community, users)
        print(f"   ✓ Created {len(markets)} markets")
        
        # Add votes
        print("👍 Adding votes...")
        add_votes(db, markets, users)
        print("   ✓ Added votes to markets")
        
        # Add chat messages
        print("💬 Adding chat messages...")
        add_chat_messages(db, markets, users)
        print("   ✓ Added chat messages")
        
        # Create orders
        print("📈 Creating orders...")
        create_orders(db, markets, users)
        print("   ✓ Created orders")
        
        # Commit everything
        db.commit()
        print("\n✅ Demo data generation complete!")
        print(f"\n📝 Summary:")
        print(f"   - Users: {len(users)}")
        print(f"   - Markets: {len(markets)}")
        print(f"   - Community: {community.name}")
        print(f"\n💡 You can now log in with any demo user:")
        print(f"   Email: {users[0].email}")
        print(f"   Password: demo123")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error generating demo data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

