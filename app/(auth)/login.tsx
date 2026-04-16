import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { FadeInView, PressableScale } from '@/components/Animated';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const router = useRouter();

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithEmail(email.trim());
    setIsLoading(false);
    if (error) {
      Alert.alert('Error', 'Failed to send magic link. Please try again.');
    } else {
      setEmailSent(true);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    const { error } = await signInWithOAuth(provider);
    setIsLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('provider') || msg.includes('not enabled') || msg.includes('disabled')) {
        Alert.alert(
          `${provider === 'google' ? 'Google' : 'Apple'} Sign-In Not Set Up`,
          `To enable, go to Supabase Dashboard → Authentication → Providers → ${provider === 'google' ? 'Google' : 'Apple'} and add your OAuth credentials. For now, use email magic link.`
        );
      } else {
        Alert.alert('Error', `Could not sign in with ${provider}: ${error.message || 'unknown error'}`);
      }
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <FadeInView>
            <View style={styles.iconCircle}>
              <FontAwesome name="envelope-o" size={48} color={Colors.brand.primary} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a magic link to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.hint}>Tap the link in the email to sign in.</Text>
            <PressableScale
              style={styles.secondaryButton}
              onPress={() => setEmailSent(false)}
            >
              <Text style={styles.secondaryButtonText}>Use a different email</Text>
            </PressableScale>
          </FadeInView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInView>
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>F</Text>
              </View>
              <Text style={styles.logo}>FreshScan</Text>
              <Text style={styles.tagline}>
                Scan your fridge. Reduce waste.{'\n'}Cook what matters.
              </Text>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="go"
                onSubmitEditing={handleEmailLogin}
              />
              <PressableScale
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Magic Link</Text>
                )}
              </PressableScale>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.oauthRow}>
                <PressableScale
                  style={styles.oauthButton}
                  onPress={() => handleOAuth('google')}
                >
                  <FontAwesome name="google" size={20} color="#DB4437" />
                  <Text style={styles.oauthButtonText}>Google</Text>
                </PressableScale>

                {Platform.OS === 'ios' && (
                  <PressableScale
                    style={styles.oauthButton}
                    onPress={() => handleOAuth('apple')}
                  >
                    <FontAwesome name="apple" size={20} color="#000" />
                    <Text style={styles.oauthButtonText}>Apple</Text>
                  </PressableScale>
                )}
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={200}>
            <Text style={styles.terms}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  centeredContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.brand.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#F9F9F9',
  },
  primaryButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: Colors.brand.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
    color: '#333',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  terms: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
