import { useEffect, useState } from 'react';
import { View, Button, FlatList, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ListsScreen({ navigation }: any) {
  const [lists, setLists] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('wishlists').select('*').eq('owner', user!.id);
    setLists(data ?? []);
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList data={lists} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('List', { id: item.id, title: item.title })}>
          <Text style={{ padding: 10 }}>{item.title}</Text>
        </TouchableOpacity>
      )} />
      <Button title="Nueva lista" onPress={() => {}} />
    </View>
  );
}
