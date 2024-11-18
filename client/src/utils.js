import start from './audio/start.mp3'
import test from './audio/test.mp3'

export const startSound = () => {
    const audio = new Audio(start); // Path to your audio file
    audio.play();
}

export const testSound = () => {
    const audio = new Audio(test); // Path to your audio file
    audio.play();
}
