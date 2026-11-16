"""Skill vocabulary used for matching. canonical name -> extra aliases.

This is a plain keyword approach: fast, predictable and explainable.
Add skills freely. Single-letter skills (C, R) are left out on purpose
because they cause false matches.
"""
import re

SKILLS: dict[str, list[str]] = {
    # Languages
    "Python": [], "Java": [], "JavaScript": ["JS", "ECMAScript"], "TypeScript": ["TS"],
    "C++": [], "C#": [], "Go": ["Golang"], "Rust": [], "Kotlin": [], "Swift": [],
    "PHP": [], "Ruby": [], "Scala": [], "Dart": [], "MATLAB": [], "Bash": ["Shell scripting"],
    "SQL": [], "HTML": ["HTML5"], "CSS": ["CSS3"],
    # Frontend
    "React": ["React.js", "ReactJS"], "Next.js": ["NextJS"], "Vue": ["Vue.js", "VueJS"],
    "Angular": ["AngularJS"], "Svelte": [], "Redux": [], "Tailwind CSS": ["Tailwind"],
    "Bootstrap": [], "Vite": [], "Webpack": [], "jQuery": [],
    # Backend
    "Node.js": ["NodeJS", "Node"], "Express": ["Express.js", "ExpressJS"], "FastAPI": [],
    "Django": [], "Flask": [], "Spring Boot": ["SpringBoot"], "Spring": [], ".NET": ["dotnet", "ASP.NET"],
    "REST API": ["REST", "RESTful", "REST APIs"], "GraphQL": [], "gRPC": [], "Microservices": ["Microservice"],
    # Data / DB
    "PostgreSQL": ["Postgres"], "MySQL": [], "SQLite": [], "MongoDB": ["Mongo"], "Redis": [],
    "Elasticsearch": [], "Firebase": [], "SQLAlchemy": [], "Prisma": [],
    # Data science / ML
    "Machine Learning": ["ML"], "Deep Learning": [], "NLP": ["Natural Language Processing"],
    "Computer Vision": [], "TensorFlow": [], "PyTorch": [], "Keras": [], "scikit-learn": ["sklearn", "scikit learn"],
    "Pandas": [], "NumPy": [], "Matplotlib": [], "Seaborn": [], "OpenCV": [], "Hugging Face": ["HuggingFace"],
    "LLM": ["LLMs", "Large Language Models"], "Data Analysis": [], "Data Visualization": [],
    "Power BI": ["PowerBI"], "Tableau": [], "Excel": [], "Spark": ["PySpark", "Apache Spark"], "Hadoop": [],
    "Statistics": [], "A/B Testing": [],
    # Cloud / DevOps
    "AWS": ["Amazon Web Services"], "Azure": [], "GCP": ["Google Cloud"], "Docker": [], "Kubernetes": ["K8s"],
    "Terraform": [], "Jenkins": [], "CI/CD": ["CICD"], "GitHub Actions": [], "Linux": [], "Nginx": [],
    "Git": [], "GitHub": [], "GitLab": [],
    # Mobile
    "Android": [], "iOS": [], "React Native": [], "Flutter": [],
    # Testing / process
    "Jest": [], "Pytest": [], "Selenium": [], "Cypress": [], "JUnit": [], "Unit Testing": [],
    "Agile": [], "Scrum": [], "Jira": [], "Figma": [],
    # Security / other
    "Cybersecurity": ["Cyber Security"], "OAuth": [], "JWT": [], "WebSockets": ["WebSocket"],
    "Data Structures": ["DSA"], "Algorithms": [], "OOP": ["Object Oriented Programming", "Object-Oriented Programming"],
    "System Design": [],
}

# Letters/digits/+/# on either side mean "this is part of a longer word", so no match.
# This keeps "Java" from matching inside "JavaScript" and "Go" from matching "Google".
_BOUNDARY_L = r"(?<![A-Za-z0-9+#.])"
# also reject "github.com", "python.org"-style domains: a dot followed by a letter
_BOUNDARY_R = r"(?![A-Za-z0-9+#]|\.[A-Za-z])"


# Terms that are also everyday English words: only match with the exact capitalisation.
_CASE_SENSITIVE_WORDS = {"Go", "Node", "Express", "Spring", "Spark", "Swift", "Ruby", "Rust", "Excel", "Spring Boot"}


def _compile(term: str) -> re.Pattern[str]:
    # allow flexible whitespace inside multi-word terms
    escaped = r"\s+".join(re.escape(part) for part in term.split())
    # Short terms (JS, TS, ML, AWS, Git...) and common words must be written exactly as listed
    case_sensitive = len(term) <= 3 or term in _CASE_SENSITIVE_WORDS
    return re.compile(_BOUNDARY_L + escaped + _BOUNDARY_R, 0 if case_sensitive else re.IGNORECASE)


SKILL_PATTERNS: list[tuple[str, list[re.Pattern[str]]]] = [
    (canonical, [_compile(t) for t in [canonical, *aliases]]) for canonical, aliases in SKILLS.items()
]
