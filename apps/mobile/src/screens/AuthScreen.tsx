import { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message); else navigation.replace('Lists');
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text>{error}</Text> : null}
      <Button title="Entrar" onPress={signIn} />
    </View>
  );
}
