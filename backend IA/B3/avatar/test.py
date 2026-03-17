from TTS.api import TTS

tts = TTS(model_name="tts_models/fr/mai/vits")
tts.tts_to_file(
    text="Bonjour, je suis un assistant vocal avec un accent français standard.",
    file_path="output.wav"
)