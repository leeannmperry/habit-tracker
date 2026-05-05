import { ImageSourcePropType } from 'react-native';

export interface TarotCard {
  id: string;
  name: string;
  source: ImageSourcePropType;
}

export const TAROT_CARDS: TarotCard[] = [
  { id: 'fool',           name: 'The Fool',          source: require('../../tarot_cards/fool.jpg') },
  { id: 'magician',       name: 'The Magician',       source: require('../../tarot_cards/magician.jpg') },
  { id: 'high_priestess', name: 'The High Priestess', source: require('../../tarot_cards/high_priestess.jpg') },
  { id: 'empress',        name: 'The Empress',        source: require('../../tarot_cards/empress.jpg') },
  { id: 'emperor',        name: 'The Emperor',        source: require('../../tarot_cards/emperor.jpg') },
  { id: 'hierophant',     name: 'The Hierophant',     source: require('../../tarot_cards/hierophant.jpg') },
  { id: 'lovers',         name: 'The Lovers',         source: require('../../tarot_cards/lovers.jpg') },
  { id: 'chariot',        name: 'The Chariot',        source: require('../../tarot_cards/chariot.jpg') },
  { id: 'strength',       name: 'Strength',           source: require('../../tarot_cards/strength.jpg') },
  { id: 'hermit',         name: 'The Hermit',         source: require('../../tarot_cards/hermit.jpg') },
  { id: 'wheel_of_fortune', name: 'Wheel of Fortune', source: require('../../tarot_cards/wheel_of_fortune.jpg') },
  { id: 'justice',        name: 'Justice',            source: require('../../tarot_cards/justice.jpg') },
  { id: 'hanged_man',     name: 'The Hanged Man',     source: require('../../tarot_cards/hanged_man.jpg') },
  { id: 'death',          name: 'Death',              source: require('../../tarot_cards/death.jpg') },
  { id: 'temperance',     name: 'Temperance',         source: require('../../tarot_cards/temperance.jpg') },
  { id: 'devil',          name: 'The Devil',          source: require('../../tarot_cards/devil.jpg') },
  { id: 'tower',          name: 'The Tower',          source: require('../../tarot_cards/tower.jpg') },
  { id: 'star',           name: 'The Star',           source: require('../../tarot_cards/star.jpg') },
  { id: 'moon',           name: 'The Moon',           source: require('../../tarot_cards/moon.jpg') },
  { id: 'sun',            name: 'The Sun',            source: require('../../tarot_cards/sun.jpg') },
  { id: 'judgement',      name: 'Judgement',          source: require('../../tarot_cards/judgement.jpg') },
  { id: 'world',          name: 'The World',          source: require('../../tarot_cards/world.jpg') },
];

export function getCardById(id: string): TarotCard | undefined {
  return TAROT_CARDS.find(c => c.id === id);
}
