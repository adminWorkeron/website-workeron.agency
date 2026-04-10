"""
External API for Workeron.agency integration
"""

import os
import json
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import wraps
from flask import request, jsonify
from datetime import datetime

# API Key for Workeron.agency (stored in environment or database)
WORKERON_API_KEY = os.environ.get('WORKERON_API_KEY', 'workeron_api_key_2026_secure')

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
ADMIN_EMAIL = 'admin@workeron.ai'

def send_candidate_email(candidate_data, analysis_result):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Warning: SMTP credentials not configured, skipping email")
        return False
    
    try:
        # Create email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🎯 Новый кандидат: {candidate_data['name']} - {candidate_data.get('vacancy', 'N/A')}"
        msg['From'] = SMTP_USER
        msg['To'] = ADMIN_EMAIL
        
        # Create HTML email body
        scores = analysis_result.get('scores', {})
        big_five = scores.get('big_five', {})
        disc = scores.get('disc', {})
        match_score = analysis_result.get('match_score', 0)
        recommendation = analysis_result.get('recommendation', 'Требуется дополнительная оценка')
        
        # Determine recommendation color
        if match_score >= 80:
            rec_color = '#3AB800'  # Green
            rec_emoji = '✅'
        elif match_score >= 60:
            rec_color = '#E1F977'  # Yellow
            rec_emoji = '⚠️'
        else:
            rec_color = '#A72D00'  # Red
            rec_emoji = '❌'
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background-color: #06090D;
                    color: #F1F4F6;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, #080D11 0%, #0D1419 100%);
                    border-radius: 20px;
                    border: 1px solid #2A3340;
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #21F0D1 0%, #0D8470 100%);
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    color: #06090D;
                    font-size: 28px;
                    font-weight: 700;
                }}
                .content {{
                    padding: 30px;
                }}
                .info-block {{
                    background: rgba(33, 240, 209, 0.05);
                    border: 1px solid rgba(33, 240, 209, 0.2);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #2A3340;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                    margin-bottom: 0;
                    padding-bottom: 0;
                }}
                .label {{
                    color: #B5BCC8;
                    font-size: 14px;
                }}
                .value {{
                    color: #F1F4F6;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .recommendation {{
                    background: {rec_color};
                    color: #06090D;
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 20px 0;
                    font-size: 18px;
                    font-weight: 700;
                }}
                .scores-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                .scores-table th {{
                    background: rgba(33, 240, 209, 0.1);
                    color: #F1F4F6;
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 14px;
                }}
                .scores-table td {{
                    padding: 12px;
                    border-bottom: 1px solid #2A3340;
                    font-size: 14px;
                    color: #F1F4F6;
                }}
                .score-bar {{
                    background: #2A3340;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 5px;
                }}
                .score-fill {{
                    background: linear-gradient(90deg, #21F0D1 0%, #0D8470 100%);
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }}
                .button {{
                    display: inline-block;
                    background: #21F0D1;
                    color: #06090D;
                    padding: 15px 30px;
                    border-radius: 32px;
                    text-decoration: none;
                    font-weight: 600;
                    margin: 20px 0;
                    text-align: center;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #B5BCC8;
                    font-size: 12px;
                    border-top: 1px solid #2A3340;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Новый кандидат</h1>
                </div>
                
                <div class="content">
                    <div class="info-block">
                        <div class="info-row">
                            <span class="label">Имя:</span>
                            <span class="value">{candidate_data['name']}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span>
                            <span class="value">{candidate_data['email']}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Вакансия:</span>
                            <span class="value">{candidate_data.get('vacancy', 'N/A')}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Дата подачи:</span>
                            <span class="value">{datetime.now().strftime('%d.%m.%Y %H:%M')}</span>
                        </div>
                    </div>
                    
                    <div class="recommendation">
                        {rec_emoji} {recommendation}
                        <div style="margin-top: 10px; font-size: 24px;">Оценка соответствия: {match_score}%</div>
                    </div>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">📊 Психологический профиль (Big Five)</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Шкала</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Сознательность (Conscientiousness)</td>
                            <td>
                                {big_five.get('conscientiousness', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {big_five.get('conscientiousness', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Экстраверсия (Extraversion)</td>
                            <td>
                                {big_five.get('extraversion', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {big_five.get('extraversion', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Доброжелательность (Agreeableness)</td>
                            <td>
                                {big_five.get('agreeableness', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {big_five.get('agreeableness', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Нейротизм (Neuroticism)</td>
                            <td>
                                {big_five.get('neuroticism', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {big_five.get('neuroticism', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Открытость (Openness)</td>
                            <td>
                                {big_five.get('openness', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {big_five.get('openness', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">💼 DISC профиль</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Тип</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Доминирование (Dominance)</td>
                            <td>
                                {disc.get('dominance', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {disc.get('dominance', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Влияние (Influence)</td>
                            <td>
                                {disc.get('influence', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {disc.get('influence', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Стабильность (Steadiness)</td>
                            <td>
                                {disc.get('steadiness', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {disc.get('steadiness', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Соответствие (Conscientiousness)</td>
                            <td>
                                {disc.get('conscientiousness', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {disc.get('conscientiousness', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">💼 Стиль работы</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Характеристика</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Лидерство (Leadership)</td>
                            <td>
                                {scores.get('work_style', {}).get('leadership', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('work_style', {}).get('leadership', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Командная работа (Teamwork)</td>
                            <td>
                                {scores.get('work_style', {}).get('teamwork', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('work_style', {}).get('teamwork', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Самостоятельность (Independence)</td>
                            <td>
                                {scores.get('work_style', {}).get('independence', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('work_style', {}).get('independence', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Адаптивность (Adaptability)</td>
                            <td>
                                {scores.get('work_style', {}).get('adaptability', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('work_style', {}).get('adaptability', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Стрессоустойчивость (Stress Tolerance)</td>
                            <td>
                                {scores.get('work_style', {}).get('stress_tolerance', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('work_style', {}).get('stress_tolerance', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">🧠 Когнитивные навыки</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Навык</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Аналитическое мышление</td>
                            <td>
                                {scores.get('cognitive_skills', {}).get('analytical_thinking', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('cognitive_skills', {}).get('analytical_thinking', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Креативное мышление</td>
                            <td>
                                {scores.get('cognitive_skills', {}).get('creative_thinking', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('cognitive_skills', {}).get('creative_thinking', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Решение проблем</td>
                            <td>
                                {scores.get('cognitive_skills', {}).get('problem_solving', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('cognitive_skills', {}).get('problem_solving', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Принятие решений</td>
                            <td>
                                {scores.get('cognitive_skills', {}).get('decision_making', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('cognitive_skills', {}).get('decision_making', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Способность к обучению</td>
                            <td>
                                {scores.get('cognitive_skills', {}).get('learning_ability', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('cognitive_skills', {}).get('learning_ability', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">💬 Коммуникация</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Навык</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Устная коммуникация</td>
                            <td>
                                {scores.get('communication', {}).get('verbal_communication', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('communication', {}).get('verbal_communication', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Письменная коммуникация</td>
                            <td>
                                {scores.get('communication', {}).get('written_communication', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('communication', {}).get('written_communication', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Активное слушание</td>
                            <td>
                                {scores.get('communication', {}).get('active_listening', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('communication', {}).get('active_listening', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Убеждение</td>
                            <td>
                                {scores.get('communication', {}).get('persuasion', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('communication', {}).get('persuasion', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Разрешение конфликтов</td>
                            <td>
                                {scores.get('communication', {}).get('conflict_resolution', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('communication', {}).get('conflict_resolution', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #21F0D1; margin-top: 30px;">🎯 Мотивация</h3>
                    <table class="scores-table">
                        <tr>
                            <th>Характеристика</th>
                            <th>Оценка</th>
                        </tr>
                        <tr>
                            <td>Стремление к достижениям</td>
                            <td>
                                {scores.get('motivation', {}).get('achievement_drive', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('motivation', {}).get('achievement_drive', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Инициативность</td>
                            <td>
                                {scores.get('motivation', {}).get('initiative', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('motivation', {}).get('initiative', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Настойчивость</td>
                            <td>
                                {scores.get('motivation', {}).get('persistence', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('motivation', {}).get('persistence', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Установка на рост</td>
                            <td>
                                {scores.get('motivation', {}).get('growth_mindset', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('motivation', {}).get('growth_mindset', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Самомотивация</td>
                            <td>
                                {scores.get('motivation', {}).get('self_motivation', 0)}/10
                                <div class="score-bar">
                                    <div class="score-fill" style="width: {scores.get('motivation', {}).get('self_motivation', 0) * 10}%"></div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <div style="text-align: center;">
                        <a href="https://liti-workeron-585551708702.europe-west1.run.app" class="button">
                            📋 Открыть полный отчет в LITI
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Это автоматическое уведомление от системы LITI</p>
                    <p>Workeron.agency | AI-powered HR Analytics</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML
        html_part = MIMEText(html, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"Email sent successfully to {ADMIN_EMAIL}")
        return True
        
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.json.get('api_key') if request.is_json else None
        if not api_key:
            api_key = request.headers.get('X-API-Key')
        
        if not api_key or api_key != WORKERON_API_KEY:
            return jsonify({
                "success": False,
                "error": "Invalid or missing API key"
            }), 401
        
        return f(*args, **kwargs)
    return decorated_function

def validate_candidate_data(data):
    errors = []
    
    if not data.get('name'):
        errors.append("Field 'name' is required")
    if not data.get('email'):
        errors.append("Field 'email' is required")
    if not data.get('interview_transcript') and not data.get('resume'):
        errors.append("At least one of 'interview_transcript' or 'resume' is required")
    
    email = data.get('email', '')
    if email and '@' not in email:
        errors.append("Invalid email format")
    
    if data.get('interview_transcript') and len(data.get('interview_transcript', '')) < 100:
        errors.append("Interview transcript too short (minimum 100 characters)")
    
    if data.get('resume') and len(data.get('resume', '')) < 50:
        errors.append("Resume too short (minimum 50 characters)")
    
    return errors

def analyze_with_openrouter(text, vacancy, scales, api_key, model):
    if not api_key:
        return {"error": "OpenRouter API key not configured"}
    
    # Build detailed prompt for analysis
    prompt = f"""You are an expert psycholinguistic analyst for HR. Analyze this candidate based on their resume and interview text.

VACANCY: {vacancy}

CANDIDATE TEXT:
{text}

TASK: Provide a comprehensive psychological assessment using multiple frameworks.

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):

{{
    "Psychological_Scales": {{
        "Conscientiousness": <score 1-10>,
        "Extraversion": <score 1-10>,
        "Agreeableness": <score 1-10>,
        "Neuroticism": <score 1-10>,
        "Openness": <score 1-10>,
        "DISC_Profile": {{
            "Dominant": <score 1-10>,
            "Influential": <score 1-10>,
            "Steady": <score 1-10>,
            "Conscientious": <score 1-10>
        }},
        "Work_Style": {{
            "Leadership": <score 1-10>,
            "Teamwork": <score 1-10>,
            "Independence": <score 1-10>,
            "Adaptability": <score 1-10>,
            "Stress_Tolerance": <score 1-10>
        }},
        "Cognitive_Skills": {{
            "Analytical_Thinking": <score 1-10>,
            "Creative_Thinking": <score 1-10>,
            "Problem_Solving": <score 1-10>,
            "Decision_Making": <score 1-10>,
            "Learning_Ability": <score 1-10>
        }},
        "Communication": {{
            "Verbal_Communication": <score 1-10>,
            "Written_Communication": <score 1-10>,
            "Active_Listening": <score 1-10>,
            "Persuasion": <score 1-10>,
            "Conflict_Resolution": <score 1-10>
        }},
        "Motivation": {{
            "Achievement_Drive": <score 1-10>,
            "Initiative": <score 1-10>,
            "Persistence": <score 1-10>,
            "Growth_Mindset": <score 1-10>,
            "Self_Motivation": <score 1-10>
        }}
    }},
    "Analysis_Rationale": {{
        "Overall_Summary": "<2-3 sentence summary of candidate profile>",
        "Key_Strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
        "Development_Areas": ["<area 1>", "<area 2>"],
        "Best_Fit_Roles": ["<role type 1>", "<role type 2>"],
        "Work_Environment_Preference": "<brief description>"
    }}
}}

SCORING GUIDELINES:

Big Five:
- Conscientiousness: Organization, responsibility, goal-orientation (1=chaotic, 10=highly organized)
- Extraversion: Social energy, assertiveness (1=introverted, 10=extraverted)
- Agreeableness: Cooperation, empathy (1=competitive, 10=cooperative)
- Neuroticism: Emotional stability (1=very stable, 10=anxious/reactive)
- Openness: Creativity, curiosity (1=conventional, 10=innovative)

DISC:
- Dominant: Direct, results-oriented, decisive
- Influential: Enthusiastic, optimistic, persuasive
- Steady: Patient, reliable, team-oriented
- Conscientious: Analytical, precise, quality-focused

Work Style:
- Leadership: Ability to guide and inspire others
- Teamwork: Collaboration and cooperation skills
- Independence: Self-sufficiency and autonomy
- Adaptability: Flexibility in changing situations
- Stress Tolerance: Ability to perform under pressure

Cognitive Skills:
- Analytical Thinking: Logical reasoning and data analysis
- Creative Thinking: Innovation and original ideas
- Problem Solving: Finding solutions to challenges
- Decision Making: Making sound judgments
- Learning Ability: Speed and depth of learning

Communication:
- Verbal Communication: Speaking clarity and effectiveness
- Written Communication: Writing skills and clarity
- Active Listening: Understanding and empathy
- Persuasion: Influencing and convincing others
- Conflict Resolution: Managing disagreements

Motivation:
- Achievement Drive: Desire to accomplish goals
- Initiative: Proactive behavior
- Persistence: Determination and resilience
- Growth Mindset: Willingness to learn and improve
- Self Motivation: Internal drive and energy

Analyze the text carefully and provide realistic, varied scores based on the actual content."""
    
    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': 'You are an expert psycholinguistic analyst. Always return valid JSON only, no markdown formatting.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.7,
                'max_tokens': 1000
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            # Clean up markdown code blocks if present
            content = content.replace('```json', '').replace('```', '').strip()
            return content
        else:
            return {"error": f"OpenRouter API error: {response.status_code}"}
    
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}

def register_external_api(app, get_db):
    
    @app.route('/api/analyze-candidate', methods=['POST'])
    @require_api_key
    def analyze_candidate():
        try:
            data = request.get_json()
            
            errors = validate_candidate_data(data)
            if errors:
                return jsonify({
                    "success": False,
                    "errors": errors
                }), 400
            
            db = get_db()
            cursor = db.execute("SELECT value FROM settings WHERE key = 'apiKey'")
            row = cursor.fetchone()
            openrouter_key = row['value'] if row else None
            
            cursor = db.execute("SELECT value FROM settings WHERE key = 'selectedModel'")
            row = cursor.fetchone()
            model = row['value'] if row else 'anthropic/claude-3.5-haiku'
            
            if not openrouter_key:
                return jsonify({
                    "success": False,
                    "error": "OpenRouter API key not configured in LITI"
                }), 500
            
            cursor = db.execute('SELECT name FROM scales WHERE enabled = 1')
            scales = [row['name'] for row in cursor.fetchall()]
            
            if not scales:
                return jsonify({
                    "success": False,
                    "error": "No scales enabled for analysis"
                }), 500
            
            text_parts = []
            if data.get('resume'):
                text_parts.append(f"RESUME:\n{data['resume']}")
            if data.get('interview_transcript'):
                text_parts.append(f"INTERVIEW:\n{data['interview_transcript']}")
            
            combined_text = "\n\n".join(text_parts)
            vacancy = data.get('vacancy', 'General position')
            
            analysis_result = analyze_with_openrouter(
                combined_text,
                vacancy,
                scales,
                openrouter_key,
                model
            )
            
            import re
            
            default_scores = {
                "big_five": {
                    "conscientiousness": 5,
                    "extraversion": 5,
                    "agreeableness": 5,
                    "neuroticism": 5,
                    "openness": 5
                },
                "dark_triad": {
                    "narcissism": 2,
                    "machiavellianism": 2,
                    "psychopathy": 1
                },
                "mbti": "INTJ",
                "disc": {
                    "dominance": 5,
                    "influence": 5,
                    "steadiness": 5,
                    "conscientiousness": 5
                },
                "work_style": {
                    "leadership": 5,
                    "teamwork": 5,
                    "independence": 5,
                    "adaptability": 5,
                    "stress_tolerance": 5
                },
                "cognitive_skills": {
                    "analytical_thinking": 5,
                    "creative_thinking": 5,
                    "problem_solving": 5,
                    "decision_making": 5,
                    "learning_ability": 5
                },
                "communication": {
                    "verbal_communication": 5,
                    "written_communication": 5,
                    "active_listening": 5,
                    "persuasion": 5,
                    "conflict_resolution": 5
                },
                "motivation": {
                    "achievement_drive": 5,
                    "initiative": 5,
                    "persistence": 5,
                    "growth_mindset": 5,
                    "self_motivation": 5
                }
            }
            
            parsed_scores = default_scores.copy()
            analysis_rationale = {}
            
            if isinstance(analysis_result, str):
                try:
                    json_match = re.search(r'\{[\s\S]*\}', analysis_result)
                    if json_match:
                        parsed_data = json.loads(json_match.group())
                        
                        if 'Psychological_Scales' in parsed_data:
                            ps = parsed_data['Psychological_Scales']
                            parsed_scores['big_five'] = {
                                'conscientiousness': ps.get('Conscientiousness', 5),
                                'extraversion': ps.get('Extraversion', 5),
                                'agreeableness': ps.get('Agreeableness', 5),
                                'neuroticism': ps.get('Neuroticism', 5),
                                'openness': ps.get('Openness', 5)
                            }
                            if 'DISC_Profile' in ps:
                                disc = ps['DISC_Profile']
                                parsed_scores['disc'] = {
                                    'dominance': disc.get('Dominant', 5),
                                    'influence': disc.get('Influential', 5),
                                    'steadiness': disc.get('Steady', 5),
                                    'conscientiousness': disc.get('Conscientious', 5)
                                }
                            if 'Work_Style' in ps:
                                ws = ps['Work_Style']
                                parsed_scores['work_style'] = {
                                    'leadership': ws.get('Leadership', 5),
                                    'teamwork': ws.get('Teamwork', 5),
                                    'independence': ws.get('Independence', 5),
                                    'adaptability': ws.get('Adaptability', 5),
                                    'stress_tolerance': ws.get('Stress_Tolerance', 5)
                                }
                            if 'Cognitive_Skills' in ps:
                                cs = ps['Cognitive_Skills']
                                parsed_scores['cognitive_skills'] = {
                                    'analytical_thinking': cs.get('Analytical_Thinking', 5),
                                    'creative_thinking': cs.get('Creative_Thinking', 5),
                                    'problem_solving': cs.get('Problem_Solving', 5),
                                    'decision_making': cs.get('Decision_Making', 5),
                                    'learning_ability': cs.get('Learning_Ability', 5)
                                }
                            if 'Communication' in ps:
                                comm = ps['Communication']
                                parsed_scores['communication'] = {
                                    'verbal_communication': comm.get('Verbal_Communication', 5),
                                    'written_communication': comm.get('Written_Communication', 5),
                                    'active_listening': comm.get('Active_Listening', 5),
                                    'persuasion': comm.get('Persuasion', 5),
                                    'conflict_resolution': comm.get('Conflict_Resolution', 5)
                                }
                            if 'Motivation' in ps:
                                mot = ps['Motivation']
                                parsed_scores['motivation'] = {
                                    'achievement_drive': mot.get('Achievement_Drive', 5),
                                    'initiative': mot.get('Initiative', 5),
                                    'persistence': mot.get('Persistence', 5),
                                    'growth_mindset': mot.get('Growth_Mindset', 5),
                                    'self_motivation': mot.get('Self_Motivation', 5)
                                }
                        if 'Analysis_Rationale' in parsed_data:
                            analysis_rationale = parsed_data['Analysis_Rationale']
                            
                except (json.JSONDecodeError, KeyError, ValueError) as e:
                    print(f"Warning: Could not parse analysis result: {e}")
            
            avg_big_five = sum(parsed_scores['big_five'].values()) / len(parsed_scores['big_five'])
            avg_disc = sum(parsed_scores['disc'].values()) / len(parsed_scores['disc'])
            avg_work_style = sum(parsed_scores['work_style'].values()) / len(parsed_scores['work_style'])
            avg_cognitive = sum(parsed_scores['cognitive_skills'].values()) / len(parsed_scores['cognitive_skills'])
            avg_communication = sum(parsed_scores['communication'].values()) / len(parsed_scores['communication'])
            avg_motivation = sum(parsed_scores['motivation'].values()) / len(parsed_scores['motivation'])
            
            match_score = int((avg_big_five * 0.25 + avg_disc * 0.25 + avg_work_style * 0.15 + 
                              avg_cognitive * 0.15 + avg_communication * 0.1 + avg_motivation * 0.1) * 10)
            
            if match_score >= 80:
                recommendation = "Рекомендуется к собеседованию"
            elif match_score >= 60:
                recommendation = "Требуется дополнительная оценка"
            else:
                recommendation = "Не рекомендуется"
            
            response = {
                "success": True,
                "candidate": data['name'],
                "email": data['email'],
                "vacancy": vacancy,
                "scores": parsed_scores,
                "match_score": match_score,
                "recommendation": recommendation,
                "analysis_raw": str(analysis_result),
                "analysis_rationale": analysis_rationale,
                "analyzed_at": None
            }
            
            scale_results = {}
            scores_dict = {}
            analyzed_scales = []
            
            big_five = response['scores'].get('big_five', {})
            for scale_name, score in big_five.items():
                display_name = scale_name.capitalize()
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[scale_name.lower()] = score
                analyzed_scales.append(display_name)
            
            disc = response['scores'].get('disc', {})
            for scale_name, score in disc.items():
                display_name = f"DISC: {scale_name.capitalize()}"
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[f"disc_{scale_name.lower()}"] = score
                analyzed_scales.append(display_name)
            
            work_style = response['scores'].get('work_style', {})
            for scale_name, score in work_style.items():
                display_name = f"Work: {scale_name.replace('_', ' ').title()}"
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[f"work_{scale_name.lower()}"] = score
                analyzed_scales.append(display_name)
            
            cognitive = response['scores'].get('cognitive_skills', {})
            for scale_name, score in cognitive.items():
                display_name = f"Cognitive: {scale_name.replace('_', ' ').title()}"
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[f"cognitive_{scale_name.lower()}"] = score
                analyzed_scales.append(display_name)
            
            communication = response['scores'].get('communication', {})
            for scale_name, score in communication.items():
                display_name = f"Comm: {scale_name.replace('_', ' ').title()}"
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[f"comm_{scale_name.lower()}"] = score
                analyzed_scales.append(display_name)
            
            motivation = response['scores'].get('motivation', {})
            for scale_name, score in motivation.items():
                display_name = f"Motivation: {scale_name.replace('_', ' ').title()}"
                scale_results[display_name] = {
                    "score": score,
                    "rawResponse": str(score)
                }
                scores_dict[f"motivation_{scale_name.lower()}"] = score
                analyzed_scales.append(display_name)
            
            now = datetime.now()
            date_str = now.strftime('%d.%m.%Y, %H:%M:%S')
            
            history_data = {
                "date": date_str,
                "candidateName": data['name'],
                "email": data['email'],
                "position": vacancy,
                "model": model,
                "analyzedScales": analyzed_scales,
                "scores": scores_dict,
                "scaleResults": scale_results,
                "inputText": combined_text,
                "vacancyText": vacancy,
                "resumeText": data.get('resume', ''),
                "source": "workeron_api",
                "matchScore": response['match_score'],
                "recommendation": response['recommendation']
            }
            
            cursor = db.execute('INSERT INTO history (data) VALUES (?)',
                               (json.dumps(history_data, ensure_ascii=False),))
            db.commit()
            
            response['history_id'] = cursor.lastrowid
            
            email_sent = send_candidate_email(data, response)
            response['email_sent'] = email_sent
            
            return jsonify(response), 200
        
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Internal server error: {str(e)}"
            }), 500
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "LITI API",
            "version": "1.0"
        }), 200
