# Academic Course Recommendation System (ACRS)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)

An intelligent, AI-powered academic advisory system that helps students find personalized university and program recommendations based on their academic profile, preferences, and goals.

![ACRS Demo](academic_crs/src/assets/dark.png)

## 🎯 Overview

ACRS is a full-stack application that leverages advanced AI agents to provide comprehensive study abroad guidance. The system processes student profiles through multiple specialized AI agents to deliver:

- **Smart Profile Analysis**: Extracts and standardizes student information from natural language
- **University Matching**: Finds suitable universities and programs within budget and academic level
- **Program Ranking**: Evaluates and ranks options based on fit and career alignment  
- **Scholarship Discovery**: Identifies relevant funding opportunities
- **Student Reviews**: Provides balanced insights from current students and alumni
- **Q&A Support**: Offers ongoing guidance and answers specific questions

## 🏗️ Architecture

### Frontend (React + Vite)
- **Multi-step Wizard Interface**: Guided experience through profile setup and results
- **Real-time Agent Execution**: Live updates as AI agents process the profile
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Theme Support**: Light and dark mode for user preference

### Backend (FastAPI + CrewAI)
- **6 Specialized AI Agents**: Each focused on a specific aspect of advisory
- **API Integration**: OpenRouter for LLM access, Serper for web search
- **Modular Design**: Easy to extend with additional agents or features
- **Admin Controls**: Override model settings and monitor system performance

## 🚀 Key Features

### 🤖 AI-Powered Analysis
- **Multi-Agent Pipeline**: Sequential processing through specialized agents
- **Natural Language Processing**: Understands free-form student descriptions
- **Real-time Web Research**: Uses live data for current university information
- **Intelligent Matching**: Considers budget, academic level, and career goals

### 📊 Comprehensive Results
- **Normalized Profile**: Clean, standardized student data
- **Matched Programs**: Universities and programs fitting the criteria
- **Ranked Recommendations**: Top options with pros/cons analysis
- **Scholarship Opportunities**: Relevant funding sources
- **Student Reviews**: Authentic feedback from current students
- **Interactive Q&A**: Ask follow-up questions about recommendations

### 🔧 Technical Highlights
- **Type Safety**: Pydantic models for data validation
- **Error Handling**: Graceful fallbacks and backup API keys
- **Caching**: Efficient processing with CrewAI caching
- **Security**: API key management and environment isolation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.8+
- OpenRouter API Key ([Get one here](https://openrouter.ai/))
- Serper API Key ([Get one here](https://serper.dev/))

### 1. Clone the Repository
```bash
git clone <repository-url>
cd academic_crs
```

### 2. Frontend Setup
```bash
cd academic_crs
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

### 3. Backend Setup
```bash
cd academic_crs_backend
pip install -r requirements.txt
python main.py
```
The backend will be available at `http://localhost:8000`

### 4. Environment Configuration
No additional environment variables required - the app uses browser localStorage for API keys and allows runtime configuration through the admin endpoints.

## 📖 How to Use

### Step 1: API Key Setup
1. Obtain API keys from OpenRouter and Serper
2. Enter them in the application's first step
3. Keys are securely stored in browser localStorage

### Step 2: Profile Creation
1. Describe your academic background in natural language
2. Include relevant details like:
   - Current degree and graduation year
   - Academic scores (CGPA, Class 12 scores)
   - Competitive exam results (JEE, SAT, etc.)
   - Career goals and preferred specializations
   - Budget constraints
   - Target countries/locations

### Step 3: AI Processing
The system will automatically:
1. **Normalize** your profile data
2. **Match** suitable universities and programs
3. **Rank** options based on fit and feasibility
4. **Find** relevant scholarships
5. **Collect** student reviews and experiences

### Step 4: Results & Recommendations
Review comprehensive results including:
- Detailed program information
- Cost analysis and budget fit
- Admission requirements and difficulty
- Pros and cons of each option
- Scholarship opportunities
- Student feedback and experiences

### Step 5: Interactive Q&A
Ask specific questions about:
- Application processes
- Scholarship applications
- Career prospects
- University-specific queries

## 🏛️ AI Agents Architecture

### 1. Profile Normalizer Agent
- **Purpose**: Clean and standardize student data
- **Output**: Structured, search-optimized profile
- **Key Functions**: Data validation, field standardization, search optimization

### 2. University Matcher Agent  
- **Purpose**: Find suitable universities and programs
- **Output**: JSON array of matching programs
- **Key Functions**: Web search, budget analysis, requirement matching

### 3. Program Specialist Agent
- **Purpose**: Evaluate and rank program recommendations
- **Output**: Detailed analysis with pros/cons
- **Key Functions**: Program evaluation, ranking, recommendation synthesis

### 4. Scholarship Finder Agent
- **Purpose**: Discover relevant funding opportunities
- **Output**: List of scholarships with details
- **Key Functions**: Scholarship research, eligibility matching, deadline tracking

### 5. Reviews Collector Agent
- **Purpose**: Gather student experiences and feedback
- **Output**: Balanced review summaries
- **Key Functions**: Review aggregation, sentiment analysis, credibility assessment

### 6. Q&A Agent
- **Purpose**: Answer follow-up questions
- **Output**: Contextual, helpful responses
- **Key Functions**: Question answering, context integration, web research

## 🔧 Configuration

### Admin Model Override
The system supports admin-level model configuration through API endpoints:

```bash
# Get current model
GET /admin/model-name

# Update model
POST /admin/model-name
{
  "model_name": "openrouter/mistralai/devstral-2512:free"
}
```

### Supported LLM Models
The system works with any OpenRouter-compatible model. Recommended models:
- `openrouter/mistralai/devstral-2512:free` (Default, cost-effective)
- `openrouter/meta-llama/llama-3.3-70b-instruct:free` (High quality)
- `openrouter/anthropic/claude-3-haiku` (Fast responses)

## 📁 Project Structure

```
academic_crs/
├── public/
│   └── vite.svg          # Vite logo
├── src/
│   ├── components/       # React components
│   │   ├── AdminModelSelector.jsx # Admin controls
│   │   ├── AgentsStep.jsx         # Agent execution display
│   │   ├── ApiKeysStep.jsx        # API key setup
│   │   ├── PillNav.jsx            # Navigation component
│   │   ├── PillNav.css            # Navigation styles
│   │   ├── ProfileStep.jsx        # Profile input
│   │   ├── ProfileStep.css        # Profile step styles
│   │   ├── ResultsStep.jsx        # Results presentation
│   │   └── ResultsStep.css        # Results step styles
│   ├── context/          # React context
│   │   └── AppContext.jsx         # Global state management
│   ├── services/         # API services
│   │   └── api.js                  # Backend communication
│   ├── assets/           # Static assets
│   │   ├── dark.png              # Dark theme background
│   │   └── light.jpg             # Light theme background
│   ├── App.css           # Main application styles
│   ├── App.jsx           # Main application component
│   ├── index.css         # Global styles
│   └── main.jsx          # Application entry point
├── .gitignore            # Git ignore rules
├── eslint.config.js      # ESLint configuration
├── index.html            # HTML template
├── package-lock.json     # Package lock file
├── package.json          # Frontend dependencies
├── README.md             # Frontend README
└── vite.config.js        # Vite configuration

academic_crs_backend/
├── AdminModelSelector.jsx       # Admin model selector component
├── agents.py                   # AI agent definitions
├── api_integration_example.py  # API integration examples
├── config.json                 # Admin configuration
├── main.py                     # FastAPI application
├── requirements.txt            # Python dependencies
└── utils.py                    # Profile extraction utilities

.dist/                          # Build output directory
README.md                       # Project README
```

## 🔒 Security & Privacy

- **API Key Management**: Keys stored locally, never transmitted to our servers
- **Data Privacy**: Student data processed locally and with API providers only
- **Environment Isolation**: Backend cleans environment variables after processing
- **No Data Storage**: No persistent storage of student profiles or results

## 🚨 Troubleshooting

### Common Issues

**Frontend not starting:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Backend API errors:**
- Verify OpenRouter and Serper API keys are valid
- Check internet connection for web search functionality
- Ensure Python dependencies are installed correctly

**Agent execution failures:**
- Verify API keys have sufficient credits
- Check backend logs for detailed error messages
- Try using backup API keys if configured

**Profile extraction issues:**
- Provide more detailed natural language descriptions
- Include specific academic level and career goals
- Add relevant scores and exam results

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation for API changes
- Ensure responsive design for UI components

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CrewAI Framework**: For the multi-agent orchestration
- **OpenRouter**: For providing access to multiple LLM models
- **Serper**: For reliable web search capabilities
- **React & FastAPI Communities**: For excellent documentation and support

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check the documentation for common solutions

---

**Built with ❤️ for students worldwide pursuing their academic dreams**