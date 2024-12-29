from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy.io.wavfile
import io
from fastapi.responses import StreamingResponse

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Load MusicGen model
print("Loading MusicGen model...")
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

if torch.cuda.is_available():
    model = model.to("cuda")
    print("Using CUDA for generation")
else:
    print("Using CPU for generation - this may be slow")

class MusicRequest(BaseModel):
    prompt: str
    duration: int = 10

@app.post("/generate")
async def generate_music(request: MusicRequest):
    print(f"Starting generation with prompt: {request.prompt}")
    print(f"Requested duration: {request.duration} seconds")

    # Process the input prompt
    print("Processing input...")
    inputs = processor(
        text=[request.prompt],
        padding=True,
        return_tensors="pt",
    )

    if torch.cuda.is_available():
        inputs = inputs.to("cuda")

    # Calculate tokens based on duration
    max_new_tokens = int(request.duration * 50 + 20)
    print(f"Generating with max_new_tokens: {max_new_tokens} for {request.duration} seconds")

    # Generate audio
    print("Generating audio...")
    audio_values = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        guidance_scale=3,
    )

    print("Processing generated audio...")
    audio_data = audio_values[0].cpu().numpy()
    
    # Create WAV file in memory
    sampling_rate = 32000
    wav_buffer = io.BytesIO()
    scipy.io.wavfile.write(wav_buffer, sampling_rate, audio_data.T)
    wav_buffer.seek(0)

    print("Returning generated audio")
    return StreamingResponse(
        wav_buffer, 
        media_type="audio/wav",
        headers={
            'Content-Disposition': 'attachment; filename="generated_music.wav"'
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)