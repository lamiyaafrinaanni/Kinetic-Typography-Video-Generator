import {Video} from '@remotion/media';
import {staticFile} from 'remotion';

export const MyComposition = () => {
  return <Video src={staticFile('video.mp4')} toneFrequency={0.8} />;
};
