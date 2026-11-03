/**
 * Masuma Autoparts East Africa - Server-Side Autonomous Knowledge & Domain Heuristic Engine
 */

export interface KnowledgeResponse {
  text: string;
  sources?: { uri: string; title: string }[];
  products?: any[];
}

export interface ChatHistoryItem {
  role: string;
  parts: { text: string }[];
}

export const STORE_DETAILS = {
  name: "Masuma Autoparts East Africa Limited",
  brandMotto: "Japanese Precision, Kenyan Strength",
  address: "Ruby Mall, First Floor, Shop FF25, Accra Road (Charles Rubia Road), Nairobi CBD, Kenya",
  landmark: "Directly behind NCBA Bank (Accra Road Branch), right next to the Tea Room stage",
  phone: "+254 792 506 590",
  secondaryPhone: "+254 742 322 222",
  whatsappUrl: "https://wa.me/254792506590",
  email: "info@masuma.africa",
  website: "https://masuma.africa",
  shopUrl: "https://shop.masuma.africa",
  hours: {
    weekdays: "Monday – Friday: 8:00 AM – 5:30 PM",
    saturday: "Saturday: 8:30 AM – 4:00 PM",
    sunday: "Sunday & Public Holidays: Closed (WhatsApp orders accepted 24/7)"
  },
  warranty: "12-Month Unlimited Mileage Warranty on ALL genuine Masuma parts"
};

export function getMasumaKnowledgeResponse(message: string, history: ChatHistoryItem[] = [], matchedProducts: any[] = []): KnowledgeResponse {
  const q = message.toLowerCase().trim();

  // If live products matched, enrich response
  let productText = '';
  if (matchedProducts && matchedProducts.length > 0) {
    productText = `\n\n📦 **In-Stock Genuine Masuma Parts at Ruby Mall Counter:**\n` +
      matchedProducts.map(p => `• **${p.name}** (SKU: \`${p.sku}\`) — **KSh ${Number(p.price).toLocaleString()}** (${p.stock ? '✅ In Stock' : '⚡ 1-Hour Dispatch'})`).join('\n') +
      `\n\n*All parts include our 12-Month Unlimited Mileage Warranty. Tap "Add to Cart" below or visit our shop!*`;
  }

  // 1. LOCATION & DIRECTIONS
  const isLocationQuery = 
    q.includes('ruby mall') || 
    q.includes('accra') || 
    q.includes('charles rubia') || 
    q.includes('location') || 
    q.includes('where are you') || 
    q.includes('where is your shop') || 
    q.includes('where is the shop') || 
    q.includes('how to find') || 
    q.includes('directions') || 
    q.includes('tea room') || 
    q.includes('river road') || 
    q.includes('ncba') || 
    q.includes('physical shop') || 
    q.includes('duka iko wapi') || 
    q.includes('mko wapi') || 
    q.includes('address') || 
    q.includes('find you') ||
    q.includes('visit you');

  if (isLocationQuery) {
    return {
      text: 
`📍 **Masuma Autoparts Physical Store Location & Directions**

**Physical Address:**
🏢 **Ruby Mall, First Floor (Shop FF25)**
📍 **Accra Road (Charles Rubia Road), Nairobi CBD, Kenya**
*(Directly behind NCBA Bank, Accra Road Branch — adjacent to the Tea Room stage)*

---

🚶 **How to Reach Us (Landmarks & Step-by-Step Directions):**

1. **From Tea Room / River Road Junction:**
   Walk approximately 50 metres up Accra Road towards Moi Avenue. Ruby Mall is on your right-hand side, directly behind NCBA Bank. Take the stairs or lift to the **First Floor**.

2. **From Kencom / Ambassadeur / Railways:**
   Head down Moi Avenue, turn onto Accra Road (Charles Rubia Road). Continue past the bus stops towards River Road. Ruby Mall is on your left just before Tea Room, right behind NCBA Bank.

3. **From Odeon / Tom Mboya Street:**
   Walk down Latema Road or Accra Road straight toward River Road. We are situated on the 1st Floor of Ruby Mall behind NCBA Bank.

---

🕒 **Operating Hours:**
• **Monday – Friday:** 8:00 AM – 5:30 PM
• **Saturday:** 8:30 AM – 4:00 PM
• **Sunday & Holidays:** Closed *(Online orders & WhatsApp inquiries active 24/7)*

📞 **Instant Contact / Live Pick-up Help:**
• **Call / WhatsApp:** [+254 792 506 590](https://wa.me/254792506590) / +254 742 322 222
• **Counter Pick-up:** You can inspect and collect your parts directly at our Ruby Mall counter. We also offer 1-hour rider delivery across Nairobi CBD!`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma East Africa Headquarters - Ruby Mall" },
        { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line (+254 792 506 590)" }
      ]
    };
  }

  // 2. WARRANTY & AUTHENTICITY
  const isWarrantyQuery = 
    q.includes('warranty') || 
    q.includes('guarantee') || 
    q.includes('waranti') || 
    q.includes('genuine') || 
    q.includes('original') || 
    q.includes('fake') || 
    q.includes('japan') || 
    q.includes('counterfeit') || 
    q.includes('return policy');

  if (isWarrantyQuery) {
    return {
      text: 
`🛡️ **Masuma 12-Month Unlimited Mileage Warranty**

Every single component sold by Masuma Autoparts East Africa is backed by our comprehensive **1-Year (12-Month) Unlimited Mileage Warranty**.

**Why Masuma Quality Excels on Kenyan Roads:**
1. **Japanese OEM Engineering:** Manufactured according to strict Japanese industrial standards (JIS) matching or exceeding original equipment specifications.
2. **Reinforced for East African Roads:** Hydraulic shock absorbers feature double-lip oil seals, high-viscosity all-weather synthetic oil, and reinforced rubber suspension bushings engineered to absorb rough, potholed terrains without premature leaks.
3. **Anti-Counterfeit Protection:** Genuine Masuma boxes feature holographic security seals and verifiable QR codes.
4. **Hassle-Free Replacement:** In the rare event of a manufacturer defect, simply present your invoice and part at our Ruby Mall branch or via your regional courier agent for rapid inspection and replacement.

Want to verify a part number or claim warranty? WhatsApp our technical team at [+254 792 506 590](https://wa.me/254792506590).`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma 12-Month Warranty Policy" }
      ]
    };
  }

  // 3. SHOCK ABSORBERS & SUSPENSION
  const isShockQuery = 
    q.includes('shock') || 
    q.includes('strut') || 
    q.includes('spring') || 
    q.includes('suspension') || 
    q.includes('damper');

  if (isShockQuery) {
    const carMention = extractCarModel(q);
    return {
      text: 
`🚗 **Masuma Heavy-Duty Shock Absorbers & Struts** ${carMention ? `for ${carMention}` : ''}

Masuma twin-tube nitrogen gas-pressurized shock absorbers are engineered specifically to provide superior stability, control, and long service life on Kenyan roads.

**Key Technical Advantages:**
• **Twin-Tube Low-Pressure Nitrogen Design:** Eliminates oil aeration and hydraulic fade, ensuring consistent damping over corrugations and speed bumps.
• **Micro-Polished Hard-Chrome Piston Rod:** Resists stone chipping, corrosion, and seal abrasion.
• **High-Durability Multi-Lip NOK Seals (Japan):** Prevents hydraulic fluid leakage under heavy loads.
• **Standard Guarantee:** Covered by our **12-Month Unlimited Mileage Warranty**.

💡 **Pricing & Fitment Verification:**
Shock absorber prices typically range from **KSh 4,500 – KSh 12,500** per piece depending on your exact vehicle model, engine, and drive type (2WD vs 4WD).

👉 **To confirm exact pricing and fitment instantly:**
Please share your **Chassis Number (VIN)** (e.g. *NZE141-XXXXXX*, *ZRE152-XXXXXX*, or *SJ5-XXXXXX*).
You can reply right here or text our parts specialist on WhatsApp at [+254 792 506 590](https://wa.me/254792506590).`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Gas Shock Absorbers Catalog" }
      ]
    };
  }

  // 4. BRAKE PADS & ROTORS
  const isBrakeQuery = 
    q.includes('brake') || 
    q.includes('pad') || 
    q.includes('pads') || 
    q.includes('rotor') || 
    q.includes('disc') || 
    q.includes('shoe');

  if (isBrakeQuery) {
    const carMention = extractCarModel(q);
    return {
      text: 
`🛑 **Masuma Performance Brake Pads & Discs** ${carMention ? `for ${carMention}` : ''}

Masuma brake pads deliver exceptional stopping power, fade resistance, and rotor-friendly performance designed for urban traffic and highway cruising in East Africa.

**Key Features:**
• **Ceramic & Semi-Metallic Formulations:** Minimal black brake dust, zero harsh rotor grooving, and quiet braking.
• **Pre-Fitted Multi-Layer Anti-Squeal Shims:** Eliminates high-frequency brake noise and vibration.
• **Thermal Scorching Treatment:** Ready for maximum braking effectiveness immediately upon installation — minimal bed-in time required.
• **Warranty:** 12-Month Unlimited Mileage Warranty.

💡 **Pricing:** Premium front brake pad sets typically range between **KSh 2,800 – KSh 6,500**.
Send your car's **Chassis Number (VIN)** on WhatsApp [+254 792 506 590](https://wa.me/254792506590) to confirm fitment today!`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Low-Dust Brake Components" }
      ]
    };
  }

  // 5. SUSPENSION BUSHINGS & STEERING
  const isSuspensionPartsQuery = 
    q.includes('bushing') || 
    q.includes('bush') || 
    q.includes('control arm') || 
    q.includes('ball joint') || 
    q.includes('tie rod') || 
    q.includes('rack end') || 
    q.includes('stabilizer') || 
    q.includes('link') || 
    q.includes('mount') || 
    q.includes('engine mounting');

  if (isSuspensionPartsQuery) {
    return {
      text: 
`🔧 **Masuma Suspension, Steering & Rubber-To-Metal Components**

Kenyan roads place severe stress on rubber bushings and steering joints. Masuma heavy-duty steering and suspension components are built to resist premature splitting and knocking.

**Available Components:**
• **Reinforced Suspension Bushings:** High-grade vulcanized rubber resisting tearing and oil degradation.
• **Complete Lower & Upper Control Arms:** Heavy-gauge stamped steel with pre-pressed bushings and ball joints.
• **Ball Joints & Tie Rod Ends:** Polished ball studs with induction-hardened pins.
• **Hydraulic Engine & Transmission Mounts:** Absorbs engine vibration for a quiet cabin ride.

All parts come with a **12-Month Unlimited Mileage Warranty**.
Visit us at Ruby Mall, 1st Floor, Accra Road, or WhatsApp [+254 792 506 590](https://wa.me/254792506590) with your VIN for instant part lookup!`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Steering & Suspension Parts" }
      ]
    };
  }

  // 6. SPARK PLUGS & SERVICE PARTS
  const isServicePartsQuery = 
    q.includes('spark') || 
    q.includes('plug') || 
    q.includes('iridium') || 
    q.includes('filter') || 
    q.includes('oil filter') || 
    q.includes('air filter') || 
    q.includes('cabin filter') || 
    q.includes('fuel filter') || 
    q.includes('water pump');

  if (isServicePartsQuery) {
    return {
      text: 
`⚡ **Masuma Fast-Moving Service Parts & Ignition**

Keep your engine operating at peak efficiency with genuine Masuma service components:
• **Iridium & Platinum Spark Plugs:** Ultra-fine 0.6mm iridium center electrode for cleaner combustion and better fuel economy.
• **High-Flow Air & Cabin Filters:** Synthetic media filtering 99.2% of dust and Kenyan red soil without choking airflow.
• **Spin-On & Element Oil Filters:** Fitted with anti-drainback silicone valves for instant cold-start lubrication.

Need a full service kit for your car? Text your vehicle model or chassis number to [+254 792 506 590](https://wa.me/254792506590) for a discounted quote!`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Service Parts Catalog" }
      ]
    };
  }

  // 7. ORDERING, DELIVERY & PAYMENT
  const isDeliveryQuery = 
    q.includes('deliver') || 
    q.includes('shipping') || 
    q.includes('send') || 
    q.includes('courier') || 
    q.includes('dispatch') || 
    q.includes('mombasa') || 
    q.includes('kisumu') || 
    q.includes('nakuru') || 
    q.includes('eldoret') || 
    q.includes('thika') || 
    q.includes('meru') || 
    q.includes('nyeri') || 
    q.includes('upcountry') || 
    q.includes('pay') || 
    q.includes('payment') || 
    q.includes('mpesa') || 
    q.includes('m-pesa') || 
    q.includes('till') || 
    q.includes('paybill') || 
    q.includes('how to buy') || 
    q.includes('how to order');

  if (isDeliveryQuery) {
    return {
      text: 
`📦 **Masuma Countrywide Delivery & Ordering Information**

We deliver genuine Masuma auto parts swiftly across all 47 counties in Kenya!

**Delivery Options:**
1. **Nairobi CBD & Metropolitan Area:**
   • **Free Counter Pick-up:** Ruby Mall, First Floor, Accra Road (Behind NCBA Bank).
   • **Express Rider Dispatch:** Delivered directly to your garage or doorstep within 1–2 hours.
2. **Upcountry Kenya (Mombasa, Kisumu, Nakuru, Eldoret, Kisii, Meru, etc.):**
   • Same-day parcel dispatch via reputable courier partners: **Easy Coach, Modern Coast, 2NK Sacco, North Rift, Guardian, Fargo Courier, G4S, Speedaf**.
   • Most parcels arrive first thing the following morning.

💳 **Payment Methods:**
• **M-Pesa:** Buy Goods Till / Paybill provided upon order confirmation.
• **Bank Transfer / Electronic Funds Transfer (EFT / RTGS).**
• **Cash / Card on collection at our Ruby Mall shop.**

To place an order or calculate delivery fees to your town, message our dispatch team on WhatsApp: [+254 792 506 590](https://wa.me/254792506590).`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Delivery & Payment Guidelines" }
      ]
    };
  }

  // 8. CONTACT & SUPPORT
  const isContactQuery = 
    q.includes('contact') || 
    q.includes('phone') || 
    q.includes('call') || 
    q.includes('whatsapp') || 
    q.includes('number') || 
    q.includes('agent') || 
    q.includes('talk to human') || 
    q.includes('customer care') || 
    q.includes('support');

  if (isContactQuery) {
    return {
      text: 
`📞 **Get in Touch with Masuma Technical Experts**

Our customer care and technical support team is ready to assist you:

• **Primary Phone / WhatsApp:** [+254 792 506 590](https://wa.me/254792506590)
• **Secondary Support Line:** +254 742 322 222
• **Email:** info@masuma.africa / sales@masuma.africa
• **Physical Shop:** First Floor, Ruby Mall, Accra Road, Nairobi CBD (Behind NCBA Bank)
• **Working Hours:** Monday – Friday (8:00 AM – 5:30 PM), Saturday (8:30 AM – 4:00 PM)

👉 [**Open WhatsApp Chat (+254 792 506 590)**](https://wa.me/254792506590)`,
      sources: [
        { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line" },
        { uri: "https://masuma.africa", title: "Masuma Official Contact Information" }
      ]
    };
  }

  // 9. SWAHILI GREETINGS
  const isSwahiliGreeting = 
    q === 'jambo' || 
    q.startsWith('jambo') || 
    q.includes('habari') || 
    q.includes('sasa') || 
    q.includes('mambo') || 
    q.includes('vipuri') || 
    q.includes('bei gani') || 
    q.includes('asante');

  if (isSwahiliGreeting) {
    return {
      text: 
`Jambo! Karibu sana Masuma Autoparts East Africa. 🇰🇪

Sisi ni wasambazaji rasmi wa vipuri halisi vya **Kijapani (Japanese OEM Genuine Parts)** kwa magari ya Toyota, Nissan, Subaru, Mazda, Honda, Mitsubishi na Isuzu.

Vipuri vyetu vyote vina **Dhamana ya Mwaka Mzima (12-Month Unlimited Mileage Warranty)**!

**Tuko wapi?**
🏢 Ruby Mall, First Floor (Shop FF25), Accra Road / Charles Rubia Road, Nairobi CBD (Nyuma ya Benki ya NCBA, karibu na Tea Room).

Je, unahitaji vipuri gani leo? Unaweza kutueleza modeli ya gari lako au nambari ya Chassis (VIN) tukupatie bei halisi mara moja! 
WhatsApp: [+254 792 506 590](https://wa.me/254792506590)`,
      sources: [
        { uri: "https://masuma.africa", title: "Masuma Kenya - Japanese Precision" }
      ]
    };
  }

  // 10. CAR MODEL SPECIFIC QUERY
  const carModel = extractCarModel(q);
  if (carModel) {
    return {
      text: 
`🚗 **Genuine Masuma Parts for ${carModel}**

We stock an extensive inventory of certified Japanese components for the **${carModel}**, including:
• **Suspension:** Front & rear shock absorbers, coil springs, stabilizer links, rack ends, tie rod ends.
• **Braking:** Front and rear ceramic brake pads, brake discs/rotors, brake shoes.
• **Bushings & Mountings:** Control arm bushings, stabilizer bar bushes, engine and transmission mountings.
• **Service Components:** Iridium long-life spark plugs, engine oil filters, air filters, and cabin filters.

All parts are engineered to Japanese OEM specifications and backed by our **12-Month Unlimited Mileage Warranty**.

💡 **To get an exact price quote and check stock availability immediately:**
Please share your vehicle's **Chassis Number (VIN)** (e.g. *NZE141-XXXXXX*, *ZRE152-XXXXXX*, or similar).
You can also visit us at **Ruby Mall, 1st Floor, Accra Road, Nairobi** or text our parts team directly on WhatsApp at [+254 792 506 590](https://wa.me/254792506590).`,
      sources: [
        { uri: "https://masuma.africa", title: `Masuma ${carModel} Parts & Fitment` },
        { uri: "https://wa.me/254792506590", title: "WhatsApp Direct Fitment Check" }
      ]
    };
  }

  // 11. DEFAULT HELPFUL FALLBACK
  return {
    text: 
`Jambo! Karibu to Masuma Autoparts East Africa. 🇰🇪

I am your technical automotive assistant. I can assist you with:
• **Store Location & Directions:** Visit our Nairobi CBD shop at **Ruby Mall, First Floor, Accra Road** (behind NCBA Bank).
• **Japanese Vehicle Fitment:** Shocks, brake pads, bushings, mounts, filters, and spark plugs for Toyota, Nissan, Subaru, Mazda, Honda, and Isuzu.
• **12-Month Warranty:** Full replacement guarantee on all genuine Masuma parts.
• **Fast Countrywide Delivery:** Same-day parcel dispatch across Kenya.

Please let me know your **Vehicle Model**, **Year**, or **Chassis Number (VIN)**, or message our master technicians directly on WhatsApp at [+254 792 506 590](https://wa.me/254792506590) for instant support!`,
    sources: [
      { uri: "https://masuma.africa", title: "Masuma Autoparts East Africa" },
      { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line (+254 792 506 590)" }
    ]
  };
}

function extractCarModel(query: string): string | null {
  const models = [
    { pattern: /\bfielder\b/i, name: "Toyota Corolla Fielder" },
    { pattern: /\bpremio\b/i, name: "Toyota Premio (NZT260/ZRT260)" },
    { pattern: /\baxio\b/i, name: "Toyota Corolla Axio" },
    { pattern: /\bprobox\b/i, name: "Toyota Probox / Succeed" },
    { pattern: /\bsucceed\b/i, name: "Toyota Succeed" },
    { pattern: /\bforester\b/i, name: "Subaru Forester (SH/SJ/SK)" },
    { pattern: /\boutback\b/i, name: "Subaru Outback / Legacy" },
    { pattern: /\bimpreza\b/i, name: "Subaru Impreza / XV" },
    { pattern: /\bx-?trail\b/i, name: "Nissan X-Trail (T31/T32)" },
    { pattern: /\bnote\b/i, name: "Nissan Note (E11/E12)" },
    { pattern: /\bsylphy\b/i, name: "Nissan Sylphy / Bluebird" },
    { pattern: /\btiida\b/i, name: "Nissan Tiida / Latio" },
    { pattern: /\bdemio\b/i, name: "Mazda Demio (DE/DJ)" },
    { pattern: /\bcx-?5\b/i, name: "Mazda CX-5 (KE/KF)" },
    { pattern: /\baxela\b/i, name: "Mazda Axela / Mazda 3" },
    { pattern: /\bfit\b/i, name: "Honda Fit / Jazz" },
    { pattern: /\bcr-?v\b/i, name: "Honda CR-V" },
    { pattern: /\bprado\b/i, name: "Toyota Land Cruiser Prado (120/150)" },
    { pattern: /\bhilux\b/i, name: "Toyota Hilux / Fortuner" },
    { pattern: /\bvanguard\b/i, name: "Toyota Vanguard / RAV4" },
    { pattern: /\brav4\b/i, name: "Toyota RAV4" },
    { pattern: /\bmark x\b/i, name: "Toyota Mark X (GRX120/130)" },
    { pattern: /\bharrier\b/i, name: "Toyota Harrier (ACU30/ZSU60)" },
    { pattern: /\bd-?max\b/i, name: "Isuzu D-Max" },
  ];

  for (const item of models) {
    if (item.pattern.test(query)) {
      return item.name;
    }
  }

  return null;
}
