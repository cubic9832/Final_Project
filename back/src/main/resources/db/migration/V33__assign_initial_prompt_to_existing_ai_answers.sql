-- Existing pre-version AI/demo answers are explicitly classified as v1.
-- Keep fixed guides, user messages and already-versioned answers unchanged.
UPDATE chatbot_messages a
JOIN chatbot_prompt_versions p ON p.version='v1'
SET a.prompt_version_id=p.id
WHERE a.role='ASSISTANT' AND a.answer_type='AI' AND a.prompt_version_id IS NULL;
