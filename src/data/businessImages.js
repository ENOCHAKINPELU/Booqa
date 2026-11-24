// Photography for the corporate landing page. Every image was checked by
// eye for fit: business hospitality and real working environments - no
// resort pools or beach holidays (this is business accommodation, not
// leisure travel). Unsplash photos, free under the Unsplash License.
// To swap one, replace its id with another Unsplash photo id.
const u = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

export const BIZ_IMAGES = {
  heroLounge: u('1590381105924-c72589b9ef3f', 1400),     // wood-panelled executive hotel lounge
  businessRoom: u('1631049307264-da0ec9d70304', 1200),   // business hotel room, city view
  partnerHandshake: u('1521791136064-7986c2920216', 1400),
  industries: {
    oilGas: u('1621905251189-08b45d6a269e', 900),          // field engineer in PPE
    marine: u('1578575437130-527eed3abbec', 900),          // container ship at port cranes
    construction: u('1541888946425-d81bb19240f5', 900),    // site team in hard hats
    corporate: u('1531482615713-2afd69097998', 900),       // professionals reviewing work
    training: u('1540575467063-178a50c2df87', 900),        // conference audience
  },
};
