import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getCurrentRune } from '../utils/rune';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const rune = getCurrentRune();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError('');
    setNotice('');
    setLoading(true);

    if (mode === 'signin') {
      const err = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const err = await signUp(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        setNotice('Account created — check your email to confirm, then sign in.');
        setMode('signin');
      }
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError('');
    setNotice('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.rune}>{rune}</Text>
        <Text style={styles.title}>RITUAL TRACKER</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholderTextColor={Colors.ink4}
              placeholder="you@example.com"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholderTextColor={Colors.ink4}
              placeholder="••••••••"
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? '...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMode} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {mode === 'signin'
                ? 'no account yet? create one'
                : 'already have an account? sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  rune: {
    fontFamily: 'Georgia',
    fontSize: 64,
    color: Colors.ink3,
    lineHeight: 72,
    marginBottom: 4,
  },
  title: {
    ...Typography.navLabel,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.ink4,
    marginBottom: 32,
  },

  card: {
    backgroundColor: Colors.bg3,
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
  },
  cardTitle: {
    ...Typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 1.4,
    color: Colors.ink,
    marginBottom: 16,
  },

  field: { marginBottom: 12 },
  label: {
    fontFamily: 'Georgia',
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 5,
    fontFamily: 'Georgia',
    fontSize: 13,
    backgroundColor: Colors.bg,
    color: Colors.ink,
  },

  error: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: '#b05050',
    marginBottom: 10,
    lineHeight: 16,
  },
  notice: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    marginBottom: 10,
    lineHeight: 16,
  },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.ink,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.bg,
  },

  toggle: { marginTop: 16, alignItems: 'center' },
  toggleText: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    textDecorationLine: 'underline',
  },
});
