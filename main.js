import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const MusicGenInterface = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Sending request to generate endpoint...');
      console.log('Request payload:', { prompt, duration });
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          duration: parseInt(duration),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate music');
      }

      const data = await response.blob();
      const url = URL.createObjectURL(data);
      setAudioUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>MusicGen Interface</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Music Description</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the music you want to generate..."
            className="h-24"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (seconds)</label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            max="30"
          />
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={isLoading || !prompt}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Music'
          )}
        </Button>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {audioUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Generated Music</label>
            <audio
              ref={audioRef}
              controls
              className="w-full"
              src={audioUrl}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicGenInterface;