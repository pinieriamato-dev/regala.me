import { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AddItemScreen({ route, navigation }: any) {
  const { wishlistId } = route.params;
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const add = async () => {
    await supabase.from('items').insert({ wishlist_id: wishlistId, title, url });
    navigation.goBack();
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Título" value={title} onChangeText={setTitle} />
      <TextInput placeholder="URL" value={url} onChangeText={setUrl} />
      <Button title="Guardar" onPress={add} />
    </View>
  );
}
