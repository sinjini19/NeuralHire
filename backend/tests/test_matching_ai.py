from app.services.matching_engine import score_candidate
from app.models import Candidate, Job


def _candidate():
    return Candidate(id=1, name='Aarav', skills=['Python', 'FastAPI'], education=[{'degree':'B.Tech in Computer Science','institution':'KIIT'}], experience={'total_years':4}, resume_filename='a.pdf', resume_text='Python FastAPI engineer')

def _job():
    return Job(id=2, title='Backend Engineer', company='Example', description='Build APIs with Python and FastAPI for our platform.', required_skills=['Python','FastAPI','Docker'], preferred_skills=['AWS'], min_experience_years=3, education_requirements=['B.Tech in Computer Science'], employment_type='full_time', status='open')

def test_matching_score_is_bounded_and_explainable():
    result = score_candidate(_candidate(), _job())
    assert 0 <= result['score'] <= 100
    assert result['details']['skills']['matched_required'] == ['Python','FastAPI']
    assert result['details']['skills']['missing_required'] == ['Docker']
    assert 'unknown' in ' '.join(result['details']['notes']).lower()

def test_matching_aliases_do_not_confuse_java_and_javascript():
    c = _candidate(); c.skills = ['JavaScript']
    j = _job(); j.required_skills = ['Java']
    result = score_candidate(c, j)
    assert result['missing_skills'] == ['Java']

def test_matching_endpoint_persists_results(client):
    from tests.conftest import make_pdf
    client.post('/api/candidates/upload', files={'file': ('aarav.pdf', make_pdf(), 'application/pdf')})
    job = client.post('/api/jobs', json={'title':'Backend Engineer','company':'Example','description':'Build APIs with Python and FastAPI for our platform.','required_skills':['Python','FastAPI'],'min_experience_years':2})
    jid = job.json()['id']
    run = client.post(f'/api/matching/jobs/{jid}/run', json={})
    assert run.status_code == 200 and run.json()['total_candidates'] == 1
    assert client.get(f'/api/matching/jobs/{jid}/results').json()['total'] == 1

def test_ai_endpoint_explains_missing_key(client, monkeypatch):
    from app.services import ai_service
    monkeypatch.setattr(ai_service, 'GEMINI_API_KEY', '')
    from tests.conftest import make_pdf
    uploaded = client.post('/api/candidates/upload', files={'file': ('aarav.pdf', make_pdf(), 'application/pdf')})
    cid = uploaded.json()['id']
    response = client.post(f'/api/ai/candidates/{cid}/summary', json={})
    assert response.status_code == 503
    assert 'GEMINI_API_KEY' in response.json()['detail']
