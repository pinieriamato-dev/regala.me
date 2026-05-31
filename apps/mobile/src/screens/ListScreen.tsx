import { useEffect, useState } from 'react';
import { View, Button, FlatList, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';

export default function ListScreen({ route, navigation }: any) {
  const { id, title } = route.params;
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from('items').select('*').eq('wishlist_id', id).order('sort_order');
    setItems(data ?? []);
  };

  useEffect(() => { navigation.setOptions({ title }); load(); }, []);

  const openPublic = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await WebBrowser.openBrowserAsync(`https://regala.me/${user?.id}/${id}`);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList data={items} keyExtractor={item => item.id} renderItem={({ item }) => (
        <Text style={{ padding: 10 }}>{item.title}</Text>
      )} />
      <Button title="Agregar" onPress={() => navigation.navigate('AddItem', { wishlistId: id })} />
      <Button title="Ver pública" onPress={openPublic} />
    </View>
  );
}
