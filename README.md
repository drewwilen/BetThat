# BetThat 2.0 - Build Specification

> **New here?** Start with [`START_HERE.md`](START_HERE.md) for a quick 5-minute guide!

Welcome! This repository contains the complete specification for building **BetThat 2.0**, an enhanced social prediction market platform.

## 📚 Documentation Structure

This repo contains three key documents that work together:

### 1. **ONE_SHOT_PROMPT.md** ⚡ START HERE
**Purpose**: Condensed, ready-to-use prompt for AI/developer  
**Use when**: Starting the build, need quick reference, want everything in one place  
**Best for**: Initial implementation, AI-assisted development

This is your **primary build prompt**. It contains:
- Core concepts and requirements
- Complete feature list
- Critical implementation details
- Database schema
- API endpoints
- Build order

👉 **Start with this file** - it's designed to be copy-pasted directly into an AI assistant or given to a developer.

### 2. **GOD_PROMPT.md** 📖 Deep Dive
**Purpose**: Comprehensive specification with full context  
**Use when**: Need detailed explanations, understanding design decisions, reference during development  
**Best for**: Understanding the "why", detailed planning, troubleshooting

Contains:
- Complete feature breakdown
- Technical architecture details
- Design principles and rationale
- Testing requirements
- Deployment considerations

👉 **Reference this** when you need more context or details about specific features.

### 3. **QUICK_START_GUIDE.md** 🚀 Implementation Patterns
**Purpose**: Code patterns, algorithms, and implementation details  
**Use when**: Actually coding, need specific patterns, understanding algorithms  
**Best for**: Implementation phase, code reference, pattern library

Contains:
- Trading engine patterns
- Orderbook display logic
- Feed algorithm
- Leaderboard calculations
- Database schema highlights
- Component structure

👉 **Use this** during active development for specific implementation patterns.

## 🎯 How to Use These Documents

### For AI-Assisted Development:

1. **Initial Setup**:
   ```
   "I'm building BetThat 2.0. Please read ONE_SHOT_PROMPT.md and set up the project structure 
   with FastAPI backend and React frontend."
   ```

2. **Feature Implementation**:
   ```
   "Implement the trading engine following the buy-only model described in ONE_SHOT_PROMPT.md. 
   Reference QUICK_START_GUIDE.md for the trading engine patterns."
   ```

3. **When Stuck**:
   ```
   "I need more context on [feature]. Please check GOD_PROMPT.md section [X]."
   ```

### For Human Developers:

1. **Read ONE_SHOT_PROMPT.md first** - Get the big picture
2. **Reference GOD_PROMPT.md** - Understand the details
3. **Use QUICK_START_GUIDE.md** - Copy patterns as needed

## 🏗️ Recommended Build Order

Follow this sequence for a systematic build:

### Phase 1: Foundation (Week 1)
- [ ] Project setup (FastAPI + React + PostgreSQL + Redis)
- [ ] Database schema implementation
- [ ] User authentication system
- [ ] Basic API structure

**Reference**: ONE_SHOT_PROMPT.md → "Build Order" section

### Phase 2: Core Trading (Week 2)
- [ ] Buy-only trading engine
- [ ] Order matching logic
- [ ] Orderbook management (Redis)
- [ ] Position tracking
- [ ] Basic trading UI

**Reference**: QUICK_START_GUIDE.md → "Trading Engine Logic"

### Phase 3: Communities & Markets (Week 3)
- [ ] Community CRUD
- [ ] Market creation
- [ ] Multiple outcomes support
- [ ] Market resolution
- [ ] Image support

**Reference**: ONE_SHOT_PROMPT.md → "Required Features" sections 2-3

### Phase 4: Portfolio & Display (Week 4)
- [ ] Portfolio views
- [ ] Position calculations
- [ ] Trade history
- [ ] Orderbook UI (side-by-side)
- [ ] Order form with position display

**Reference**: QUICK_START_GUIDE.md → "Position Display Pattern"

### Phase 5: Social Features (Week 5)
- [ ] Feed with voting
- [ ] Market chat
- [ ] Confirmation slips
- [ ] Leaderboards

**Reference**: ONE_SHOT_PROMPT.md → "Required Features" sections 6-9

### Phase 6: Advanced Features (Week 6)
- [ ] Community tokens
- [ ] Enhanced admin system
- [ ] Email domain restrictions
- [ ] Karma system

**Reference**: GOD_PROMPT.md → "New Features to Add"

### Phase 7: Polish & Launch (Week 7)
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Testing
- [ ] Documentation

## 🔑 Key Principles (Don't Forget!)

1. **Buy-Only Model is Sacred**: Users only "buy" YES or NO - never change this
2. **Intuitive First**: Non-traders should understand everything without explanation
3. **Visual Clarity**: Prices as percentages, clear position displays, color coding
4. **Social Engagement**: Feed, voting, and leaderboards drive usage
5. **Performance Matters**: Sub-100ms orderbook updates, cached leaderboards

## 📋 Quick Checklist

Before starting, ensure you understand:
- [ ] The buy-only trading model (YES + NO = 1.0)
- [ ] Position closing logic (buying opposite closes existing)
- [ ] Orderbook display (side-by-side, inverted asks)
- [ ] Feed algorithm (trending score calculation)
- [ ] Leaderboard metrics (trades, profit, karma)

## 🆘 Getting Help

- **Concept Questions**: Check GOD_PROMPT.md
- **Implementation Questions**: Check QUICK_START_GUIDE.md
- **Quick Reference**: Check ONE_SHOT_PROMPT.md

## 🎨 Design Philosophy

> "Make prediction markets accessible to non-traders through intuitive UI, clear payoff displays, and social engagement."

Every feature should serve this goal. If something feels confusing to a non-trader, simplify it.

---

## Next Steps

1. **Read ONE_SHOT_PROMPT.md** completely
2. **Set up your development environment**
3. **Start with Phase 1** (Foundation)
4. **Reference other docs as needed**

Good luck building BetThat 2.0! 🚀
