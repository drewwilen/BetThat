# Generate Demo Data

This script generates synthetic demo data for the BetThat platform, including:
- Demo users
- Demo community
- Markets (with various outcome types)
- Votes (upvotes/downvotes)
- Chat messages
- Orders/bids

## Usage

1. Make sure your backend is set up and the database is running:
   ```bash
   cd backend
   # Activate virtual environment if needed
   source venv/bin/activate
   ```

2. Run the script:
   ```bash
   python generate_demo_data.py
   ```

## What it creates

- **15 Demo Users**: Usernames like "TraderPro", "CryptoKing", etc.
  - Email format: `{username}@demo.com`
  - Password: `demo123`
  - Starting balance: $10,000

- **1 Demo Community**: "Demo Community" with all demo users as members

- **8 Markets**: Various market types including:
  - Bitcoin price predictions
  - Election outcomes
  - Sports predictions
  - Tech company predictions
  - And more...

- **Votes**: 5-15 votes per market (70% upvotes, 30% downvotes)

- **Chat Messages**: 3-10 messages per market with realistic demo content

- **Orders**: 2-8 orders per outcome (YES/NO) with random prices and quantities

## Notes

- The script is idempotent - you can run it multiple times safely
- Existing users/communities won't be duplicated
- New markets will be added each time you run it
- Votes and messages will be added to all markets (including new ones)

## Demo Login

After running the script, you can log in with any demo user:
- Email: `traderpro@demo.com` (or any other username)
- Password: `demo123`

