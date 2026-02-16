import { View, StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const videoSource = require('../../../assets/animation/logo_spin.mp4');

export default function LogoCard() {
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH * 0.5,
    aspectRatio: 1,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
