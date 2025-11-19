import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView } from 'react-native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

type OnboardingProps = {
  onFinish: () => void;
};

const slides = [
  {
    key: 'email',
    title: 'Kelola Promo Lebih Mudah',
    description: 'Pantau dan kelola promo outlet dengan cepat dari satu aplikasi.',
    animation: require('../../../assets/onboarding/email-marketing.json'),
  },
  {
    key: 'growth',
    title: 'Analisa Pertumbuhan',
    description: 'Lihat dampak diskon terhadap penjualan di banyak outlet.',
    animation: require('../../../assets/onboarding/growth-analysis.json'),
  },
  {
    key: 'sales',
    title: 'Siap Melayani Pelanggan',
    description: 'Pastikan label harga di rak selalu akurat dan up to date.',
    animation: require('../../../assets/onboarding/business-salesman.json'),
  },
];

export function Onboarding({ onFinish }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const newIndex = Math.round(offsetX / width);
          setIndex(newIndex);
        }}
      >
        {slides.map((slide, i) => (
          <View key={slide.key} style={styles.slide}>
            <View style={styles.animationContainer}>
              <LottieView
                source={slide.animation}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {isLast && (
            <Pressable style={styles.button} onPress={onFinish}>
              <Text style={styles.buttonText}>Mulai Sekarang</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -210,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: width * 0.8,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 150,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 32,
  },
  buttonContainer: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
