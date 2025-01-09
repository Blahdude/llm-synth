from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy.io.wavfile
import io
from diffusers import StableDiffusionPipeline
import gc
import base64

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

# Load models at startup
print("Loading models...")
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

# Initialize Stable Diffusion with CPU settings
print("Loading Stable Diffusion model...")
image_model_id = "OFA-Sys/small-stable-diffusion-v0"
image_pipe = StableDiffusionPipeline.from_pretrained(
    image_model_id,
    torch_dtype=torch.float32,  # Use float32 for CPU
    safety_checker=None  # Disable safety checker to save memory
)

# Ensure we're using CPU
image_pipe = image_pipe.to("cpu")
model = model.to("cpu")

class MusicRequest(BaseModel):
    prompt: str
    duration: int = 10
    model: str = "facebook/musicgen-small"

@app.post("/generate")
async def generate_music(request: MusicRequest):
    try:
        # Log the received request for debugging
        print("Received request:", request)
        print("Prompt:", request.prompt)
        print("Duration:", request.duration)
        print("Model:", request.model)

        # Generate image with optimized settings for CPU
        print("Generating image...")
        with torch.inference_mode():
            image = image_pipe(
                request.prompt,
                num_inference_steps=15,
                guidance_scale=7.5
            ).images[0]
        
        gc.collect()  # Clean up memory

        # Convert image to base64
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode()

        # Generate music
        print("Processing input...")
        inputs = processor(
            text=[request.prompt],
            padding=True,
            return_tensors="pt",
        )

        # Generate audio
        print("Generating audio...")
        audio_values = model.generate(
            **inputs,
            max_new_tokens=int(request.duration * 50 + 20),
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
        audio_base64 = base64.b64encode(wav_buffer.getvalue()).decode()

        # Return both as JSON
        return {
            "audio": audio_base64,
            "image": img_base64
        }

    except Exception as e:
        print(f"Error in generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)