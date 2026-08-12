import os
from pydantic import BaseModel
from typing import List
from google import genai
from models.domain import AIRecommendationType

# Initialize Gemini Client
# Assumes GEMINI_API_KEY is in the environment
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY") or "mock_key")

class QuestionEvaluationResult(BaseModel):
    viva_question_id: int
    score_communication: float
    score_technical: float
    score_confidence: float
    ai_feedback: str

class SessionEvaluationResult(BaseModel):
    aggregate_score: float
    ai_recommendation: AIRecommendationType
    strengths: str
    areas_of_improvement: str
    question_evaluations: List[QuestionEvaluationResult]

def evaluate_interview_session(questions_data: list) -> SessionEvaluationResult:
    """
    Evaluates a full interview session using Gemini.
    questions_data is a list of dicts:
    [
        {
            "viva_question_id": 1,
            "question_text": "Explain React state.",
            "transcript": "State is internal to a component..."
        },
        ...
    ]
    """
    if not questions_data:
        # Return empty/default result if no questions were answered
        return SessionEvaluationResult(
            aggregate_score=0.0,
            ai_recommendation=AIRecommendationType.FAIL,
            strengths="N/A",
            areas_of_improvement="Candidate did not answer any questions.",
            question_evaluations=[]
        )

    prompt = (
        "You are an expert technical interviewer evaluating a candidate's performance in a Viva session. "
        "Review the following questions and the candidate's answers. Provide an evaluation for each question "
        "(scoring communication, technical accuracy, and confidence out of 10, plus specific feedback). "
        "Also provide an overall session evaluation including an aggregate score out of 10, a recommendation "
        "(PASS, FAIL, or BORDERLINE), overall strengths, and areas for improvement. "
        "Be professional and constructive.\n\n"
        "Questions & Answers:\n"
    )

    for q in questions_data:
        prompt += f"Question ID {q['viva_question_id']}: {q['question_text']}\n"
        prompt += f"Candidate Answer: {q['transcript']}\n\n"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': SessionEvaluationResult,
            },
        )
        return response.parsed
    except Exception as e:
        print(f"Error evaluating session with Gemini: {e}")
        # Fallback in case of error (e.g. no API key, network error)
        evals = []
        for q in questions_data:
            evals.append(QuestionEvaluationResult(
                viva_question_id=q['viva_question_id'],
                score_communication=5.0,
                score_technical=5.0,
                score_confidence=5.0,
                ai_feedback="Evaluation failed due to an API error."
            ))
        return SessionEvaluationResult(
            aggregate_score=5.0,
            ai_recommendation=AIRecommendationType.BORDERLINE,
            strengths="N/A",
            areas_of_improvement="Evaluation failed.",
            question_evaluations=evals
        )
