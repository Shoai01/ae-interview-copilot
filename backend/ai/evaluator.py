import os
from pydantic import BaseModel, Field
from typing import List
from google import genai
from models.domain import AIRecommendationType

# Initialize Gemini Client using Vertex AI
# Requires GOOGLE_APPLICATION_CREDENTIALS in env
client = genai.Client(
    vertexai=True,
    location="us-central1"
)

class QuestionEvaluationResult(BaseModel):
    viva_question_id: int
    score_communication: float
    score_technical: float
    score_confidence: float
    ai_feedback: str = Field(description="Constructive feedback on the answer. **CRITICAL: If Fraud Flags are listed for this question, you MUST start your feedback with a warning noting the specific fraud flags detected.**")

class LLMSessionEvaluationResult(BaseModel):
    ai_recommendation: AIRecommendationType
    strengths: str
    areas_of_improvement: str
    question_evaluations: List[QuestionEvaluationResult]

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

    system_instruction = (
        "You are an expert technical interviewer evaluating a candidate's performance in a Viva session. "
        "Review the following questions and the candidate's answers. Provide an evaluation for each question "
        "(scoring communication, technical accuracy, and confidence out of 10, plus specific feedback). "
        "Also provide an overall session evaluation including a recommendation "
        "(PASS, FAIL, or BORDERLINE), overall strengths, and areas for improvement. "
        "Be professional and constructive.\n\n"
        "SCORING RUBRIC (Apply to communication, technical, and confidence):\n"
        "- 8-10: Correct, clear, and highly confident. Excellent grasp of the topic.\n"
        "- 5-7: Mostly correct but missing key details, slightly hesitant, or mildly vague.\n"
        "- 1-4: Incorrect, extremely vague, or highly unsure/stumbling.\n"
        "- 0: No real answer provided (e.g., 'I don't know' or blank).\n\n"
        "EDGE CASES:\n"
        "1. EMPTY/NON-RESPONSES: If the candidate's answer is blank, nonsensical, or explicitly states they don't know, score 0 across all categories. In the feedback, do not invent critiques; simply state 'No answer provided'.\n"
        "2. FRAUD FLAGS: If a question is marked with 'Fraud Flags', include a short note about this in the feedback (e.g., 'Note: Tab switch detected during this answer.'). However, do NOT lower the candidate's score because of the fraud flags; score only based on the content of the answer, as fraud review is handled independently."
    )

    user_prompt = "Questions & Answers:\n"

    for q in questions_data:
        user_prompt += f"Question ID {q['viva_question_id']}: {q['question_text']}\n"
        user_prompt += f"Candidate Answer: {q['transcript']}\n"
        flags = q.get('fraud_flags', [])
        if flags:
            user_prompt += f"Fraud Flags: {', '.join(flags)}\n"
        user_prompt += "\n"

    from tenacity import retry, wait_exponential, stop_after_attempt

    def log_retry(retry_state):
        print(f"⚠️ Retrying Gemini API call due to error: {retry_state.outcome.exception()} (Attempt {retry_state.attempt_number})")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        before_sleep=log_retry
    )
    def _call_gemini_api():
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_prompt,
            config={
                'system_instruction': system_instruction,
                'response_mime_type': 'application/json',
                'response_schema': LLMSessionEvaluationResult,
            },
        )
        return response.parsed

    try:
        llm_result = _call_gemini_api()
        
        # Calculate aggregate score from per-question scores
        total_score = 0.0
        count = 0
        for q in llm_result.question_evaluations:
            # Average of the 3 metrics for each question
            q_avg = (q.score_communication + q.score_technical + q.score_confidence) / 3.0
            total_score += q_avg
            count += 1
            
        calculated_aggregate = round(total_score / count, 1) if count > 0 else 0.0
        
        return SessionEvaluationResult(
            aggregate_score=calculated_aggregate,
            ai_recommendation=llm_result.ai_recommendation,
            strengths=llm_result.strengths,
            areas_of_improvement=llm_result.areas_of_improvement,
            question_evaluations=llm_result.question_evaluations
        )
    except Exception as e:
        print(f"❌ Gemini evaluation failed after retries: {e}. Falling back to default dummy score.")
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
