import requests
import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re

# Configuration
HUGGINGFACE_API_TOKEN = "INSERT ATTACHED TOKEN FROM SAKAI HERE"
HUGGINGFACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

# FastAPI app setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation storage
conversation_history = {}

class Message(BaseModel):
    user_message: str
    # session_id to track different conversations
    session_id: str = "default"  

class ConversationReset(BaseModel):
    session_id: str = "default"

@app.post("/chat/")
async def chat_with_historical_figure(message: Message):
    # Get or initialize conversation history for this session
    if message.session_id not in conversation_history:
        conversation_history[message.session_id] = []
    
    # Add user message to history
    conversation_history[message.session_id].append({"role": "user", "content": message.user_message})
    
    # Get response from model using conversation history
    response = call_huggingface_model(message.user_message, conversation_history[message.session_id])
    
    # Handle errors
    if isinstance(response, str) and response.startswith("Error:"):
        return {"error": response}
    
    # Add Lincoln's response to history
    conversation_history[message.session_id].append({"role": "assistant", "content": response})
    
    # Limit history length to prevent context getting too long
    if len(conversation_history[message.session_id]) > 10:  
        conversation_history[message.session_id] = conversation_history[message.session_id][-10:]
    
    return {"response": response}

@app.post("/reset/")
async def reset_conversation(reset: ConversationReset):
    """Reset the conversation history for a session"""
    if reset.session_id in conversation_history:
        conversation_history[reset.session_id] = []
    return {"status": "Conversation reset successfully"}

def format_conversation_history(history):
    """Format conversation history into a prompt the model can understand"""
    formatted_history = ""
    
    # Only use the last few exchanges to avoid exceeding token limits
    for i in range(0, len(history), 2):
        if i < len(history):
            user_msg = history[i]["content"]
            formatted_history += f"User: {user_msg}\n"
            
        if i+1 < len(history):
            assistant_msg = history[i+1]["content"]
            formatted_history += f"Abraham Lincoln: {assistant_msg}\n\n"
    
    return formatted_history

def clean_response_text(text):
    """Clean up response text by removing questions, meta-commentary, and internal instructions"""
    if not text:
        return ""
    
    # First check for parentheses content which often contains meta-commentary
    # This handles cases like: (Remembering that the conversation is just beginning...)
    cleaned_text = text
    
    # Remove entire parenthetical comments
    cleaned_text = re.sub(r'\([^)]*\)', '', cleaned_text)
    
    # Check for phrases that indicate model instructions or next steps
    instruction_markers = [
        "next question", 
        "Wait for the user", 
        "Please provide a response",
        "simply acknowledge",
        "Jack:", "User:"  
    ]
    
    for marker in instruction_markers:
        if marker.lower() in cleaned_text.lower():
            cleaned_text = cleaned_text.split(marker, 1)[0].strip()
    
    # Original patterns to remove from responses
    patterns_to_remove = [
        "\nQuestion:", " Question:", 
        "\nUser:", " User:",
        "Note:", "note:", 
        " ---", "\n---",
        "As Abraham Lincoln", "as Abraham Lincoln",
        "I am roleplaying", "I am responding as",
        "Remember,", "speaking as"
    ]
    
    # Apply all cleanup patterns
    for pattern in patterns_to_remove:
        if pattern in cleaned_text:
            cleaned_text = cleaned_text.split(pattern, 1)[0].strip()
    
    # Clean up any trailing colons that might be left after removing text
    cleaned_text = re.sub(r':\s*$', '', cleaned_text)
    
    return cleaned_text.strip()

def call_huggingface_model(user_prompt, history):
    url = f"https://api-inference.huggingface.co/models/{HUGGINGFACE_MODEL}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"}

    # Format previous conversation history if available
    previous_conversation = ""
    if len(history) > 1:  # If we have more than just the current user message
        # Convert to history format, excluding the current message
        previous_conversation = format_conversation_history(history[:-1])
        
    # System message for Lincoln roleplay with more specific instructions
    system_prompt = (
        "You are roleplaying as Abraham Lincoln, the 16th President of the United States. "
        "Respond to the user as Lincoln would, with wisdom, humility, and historical context. "
        "Keep your responses concise (100-150 words maximum). "
        "Remember details the user shared earlier in the conversation. "
        "DO NOT include any meta-commentary, instructions to yourself, or parenthetical notes. "
        "DO NOT make up user responses or continue the conversation as if you were the user. "
        "Only respond as Abraham Lincoln without any additional commentary.\n\n"
    )

    # Structure for the model input with conversation history
    full_prompt = (
        system_prompt +
        # Include previous conversation
        previous_conversation + 
        f"User: {user_prompt}\nAbraham Lincoln:"
    )

    payload = {
        "inputs": full_prompt,
        "parameters": {
            "max_new_tokens": 200, 
            "temperature": 0.7,
            "top_p": 0.9,
            "return_full_text": False,
            "stop_sequences": ["\nUser:", "User:", "\nQuestion:", "Question:"]
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()

        data = response.json()

        # Check for HuggingFace specific errors first
        if isinstance(data, dict) and "error" in data:
            if "estimated_time" in data:
                return f"Error: Model is loading. Please try again in {data['estimated_time']:.0f} seconds. ({data['error']})"
            return f"HuggingFace API Error: {data['error']}"

        # Process the response text
        if isinstance(data, list) and data and isinstance(data[0], dict) and "generated_text" in data[0]:
            generated_text = data[0]["generated_text"]
            return clean_response_text(generated_text)

        # Handle unexpected formats
        if isinstance(data, list) and data:
            for item in data:
                if isinstance(item, dict):
                    for key, value in item.items():
                        if isinstance(value, str) and value:
                            return clean_response_text(value)

        return f"Unknown HuggingFace response format: {data}"

    except requests.exceptions.RequestException as e:
        return f"Network or API Request Error: {e}"
    except Exception as e:
        return f"An unexpected error occurred: {e}"