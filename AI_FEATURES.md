# StudyPath AI Features Documentation

## Overview

StudyPath integrates sophisticated AI algorithms to provide personalized study recommendations, intelligent planning optimization, and academic performance insights. The AI system analyzes user behavior, academic performance, and module characteristics to deliver tailored educational guidance.

## 🤖 Module Recommendation Engine

### Algorithm Overview

The recommendation system uses a multi-factor scoring algorithm that considers:

- **Performance History**: Your grades and completion rates
- **Category Expertise**: Experience in different subject areas (INF, MAN, MK, etc.)
- **Workload Management**: Current semester load and capacity
- **Focus Area Preferences**: Specialization priorities
- **Module Dependencies**: Prerequisites and logical progression

### API Endpoint

```http
GET /recommendations/modules?maxCredits=15&focusArea=INF&targetSemester=WS2024
```

### Query Parameters

- `maxCredits` (number, default: 15): Maximum credit points for recommendations
- `focusArea` (string, optional): Preferred category (INF, MAN, MK, GS, etc.)
- `targetSemester` (string, optional): Target semester for planning
- `includeCompleted` (boolean, default: false): Include already completed modules

### Response Example

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "module": {
          "pool": "IT Vertiefung",
          "code": "INF2528",
          "name": "Machine Learning",
          "credits": 6,
          "category": "INF"
        },
        "score": 85,
        "reasons": [
          "Focus area: INF",
          "2 modules in INF",
          "Suitable for high achiever"
        ],
        "difficulty": "hard",
        "prerequisites": ["Programming knowledge required"],
        "recommendedSemester": 4
      }
    ],
    "metadata": {
      "totalAvailable": 42,
      "selectedCount": 3,
      "totalCredits": 15,
      "userProgress": {
        "completed": 8,
        "enrolled": 3,
        "averageGrade": 1.8
      }
    }
  }
}
```

### Scoring Algorithm Details

#### Performance-Based Scoring (0-25 points)

- **High Performers** (avg grade ≤ 2.0): Bonus for challenging modules (6+ credits)
- **Struggling Students** (avg grade > 3.0): Bonus for manageable modules (≤6 credits)

#### Category Experience (0-15 points)

- 5 points per completed module in the same category
- Encourages building expertise in familiar areas

#### Focus Area Bonus (0-25 points)

- 25 points for modules matching specified focus area
- Supports specialization goals

#### Pool Priority (0-30 points)

- **Orientierungsphase**: 30 points (foundation priority)
- **IT Vertiefung**: 20 points (core specialization)
- **Others**: Variable based on context

## 📊 Study Plan Optimization

### Algorithm Overview

The optimization engine uses a bin-packing algorithm combined with educational best practices to distribute modules across semesters optimally.

### API Endpoint

```http
POST /recommendations/study-plan
```

### Request Body

```json
{
  "studyPlanId": "uuid-of-study-plan",
  "semesterCount": 6,
  "maxCreditsPerSemester": 15,
  "prioritizeEasyModules": false
}
```

### Optimization Strategies

#### Foundation-First Approach

1. **Orientierungsphase modules** get highest priority (semester 1-2)
2. **IT Vertiefung modules** follow (semester 2-4)
3. **Electives** fill remaining slots (semester 3-6)

#### Credit Balancing

- Distributes workload evenly across semesters
- Respects maximum credits per semester
- Considers module difficulty levels

#### Dependency Awareness

- Places prerequisites before dependent modules
- Infers dependencies from naming patterns and course codes
- Ensures logical progression

### Response Example

```json
{
  "success": true,
  "data": {
    "studyPlan": {
      "id": "plan-uuid",
      "name": "My Study Plan",
      "description": "Optimized plan"
    },
    "optimizedDistribution": {
      "Semester 1": [
        {
          "module": {
            "code": "INF1001",
            "name": "Webbasierte Programmierung 1",
            "credits": 10
          },
          "credits": 10,
          "priority": 5
        }
      ],
      "Semester 2": [...]
    },
    "settings": {
      "semesterCount": 6,
      "maxCreditsPerSemester": 15,
      "prioritizeEasyModules": false
    }
  }
}
```

## 💡 Academic Insights Engine

### Insight Categories

#### Performance Insights

- **Outstanding Performance**: For students with avg grade ≤ 2.0
- **Academic Support Needed**: For students with avg grade > 3.0
- Personalized recommendations based on performance trends

#### Workload Management

- **High Workload Alert**: When enrolled in >4 modules simultaneously
- **Balanced Schedule**: Recommendations for optimal course load
- **Credit Distribution**: Analysis of semester workload patterns

#### Planning Insights

- **Study Plan Creation**: Encourages structured planning
- **Category Balance**: Ensures well-rounded education
- **Progress Tracking**: Milestone celebrations and goal setting

### API Endpoint

```http
GET /recommendations/insights
```

### Response Example

```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "performance",
        "title": "Outstanding Performance",
        "description": "Average grade: 1.8. Consider challenging modules.",
        "priority": "low",
        "actionable": true
      },
      {
        "type": "workload",
        "title": "High Workload Alert",
        "description": "5 modules in progress. Consider workload balance.",
        "priority": "high",
        "actionable": true
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🎯 AI Algorithm Implementation

### Module Scoring Formula

```
Total Score = Credit Score + Focus Bonus + Experience Bonus + Performance Bonus + Pool Priority

Where:
- Credit Score = min(credits / 10 * 20, 20)
- Focus Bonus = 25 if matches focus area, else 0
- Experience Bonus = min(category_experience * 5, 15)
- Performance Bonus = 0-15 based on grades and module difficulty
- Pool Priority = 30 (Orient.) | 20 (IT) | 0-10 (others)
```

### Difficulty Assessment

```javascript
if (credits <= 3) difficulty = 'easy';
else if (credits >= 9) difficulty = 'hard';
else difficulty = 'medium';
```

### Prerequisite Detection

- Code patterns (e.g., "2" in course code suggests advanced level)
- Name analysis (keywords like "Advanced", "Machine Learning")
- Category-specific requirements (INF modules need programming)

### Semester Recommendation Logic

```javascript
if (pool === 'Orientierungsphase') return 1;
if (pool === 'IT Vertiefung') return max(2, ceil(user_progress / 3));
return max(3, ceil(user_progress / 2));
```

## 🔧 Configuration & Customization

### AI Parameters (Environment Variables)

```env
# Recommendation tuning
AI_PERFORMANCE_WEIGHT=0.3
AI_EXPERIENCE_WEIGHT=0.4
AI_WORKLOAD_WEIGHT=0.3

# Difficulty thresholds
AI_EASY_CREDITS_THRESHOLD=3
AI_HARD_CREDITS_THRESHOLD=9

# Performance grade thresholds
AI_HIGH_PERFORMER_THRESHOLD=2.0
AI_STRUGGLING_THRESHOLD=3.0
```

### Customization Options

- **Scoring weights**: Adjust importance of different factors
- **Difficulty thresholds**: Modify credit-based difficulty assessment
- **Performance bands**: Customize grade-based recommendations
- **Pool priorities**: Adjust importance of different module pools

## 📈 Future AI Enhancements

### Planned Features

1. **Machine Learning Integration**: Real ML models trained on student data
2. **Collaborative Filtering**: Recommendations based on similar students
3. **Temporal Analysis**: Consider time-based performance patterns
4. **Advanced Prerequisites**: Full dependency graph analysis
5. **Career Path Optimization**: Align recommendations with career goals

### Data Sources for Enhancement

- Historical student performance data
- Industry skill requirements
- Professor ratings and feedback
- Module completion statistics
- Employment outcomes

---

## Usage Examples

### Getting Personalized Recommendations

```bash
curl -X GET "http://localhost:3000/recommendations/modules?maxCredits=12&focusArea=INF" \
  -H "Authorization: Bearer your-jwt-token"
```

### Optimizing a Study Plan

```bash
curl -X POST "http://localhost:3000/recommendations/study-plan" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "studyPlanId": "your-plan-id",
    "semesterCount": 6,
    "maxCreditsPerSemester": 15,
    "prioritizeEasyModules": false
  }'
```

### Getting Academic Insights

```bash
curl -X GET "http://localhost:3000/recommendations/insights" \
  -H "Authorization: Bearer your-jwt-token"
```

The AI system continuously learns from user interactions and feedback to improve recommendation quality over time.
