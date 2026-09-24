/* Solaris AI OS — reference data, agent defaults, call scripts and demo seed.
   All sample people, numbers and leads are fictional demo data. */
(function () {
  const AREAS = [
    { en: 'Gangapur Road', dv: 'गंगापूर रोड', zone: 'West' },
    { en: 'College Road', dv: 'कॉलेज रोड', zone: 'West' },
    { en: 'Makhmalabad', dv: 'मखमलाबाद', zone: 'West' },
    { en: 'Trimbakeshwar', dv: 'त्र्यंबकेश्वर', zone: 'West' },
    { en: 'Indira Nagar', dv: 'इंदिरा नगर', zone: 'East' },
    { en: 'CIDCO', dv: 'सिडको', zone: 'East' },
    { en: 'Pathardi Phata', dv: 'पाथर्डी फाटा', zone: 'East' },
    { en: 'Dwarka', dv: 'द्वारका', zone: 'East' },
    { en: 'Adgaon', dv: 'आडगाव', zone: 'East' },
    { en: 'Satpur MIDC', dv: 'सातपूर MIDC', zone: 'Industrial' },
    { en: 'Ambad MIDC', dv: 'अंबड MIDC', zone: 'Industrial' },
    { en: 'Sinnar', dv: 'सिन्नर', zone: 'Industrial' },
    { en: 'Malegaon', dv: 'मालेगाव', zone: 'Industrial' },
    { en: 'Nashik Road', dv: 'नाशिक रोड', zone: 'North' },
    { en: 'Deolali Camp', dv: 'देवळाली कॅम्प', zone: 'North' },
    { en: 'Panchavati', dv: 'पंचवटी', zone: 'North' },
    { en: 'Niphad', dv: 'निफाड', zone: 'North' },
    { en: 'Ozar', dv: 'ओझर', zone: 'North' },
    { en: 'Dindori', dv: 'दिंडोरी', zone: 'North' },
    { en: 'Igatpuri', dv: 'इगतपुरी', zone: 'North' }
  ];

  const TEAM = [
    { id: 'u_owner', name: 'Solaris Owner', role: 'Owner', phone: '+91 90000 00001', areas: [], active: true },
    { id: 'u_amit', name: 'Amit Deshmukh', role: 'Sales', phone: '+91 90000 00011', areas: ['Gangapur Road', 'College Road', 'Makhmalabad', 'Trimbakeshwar'], segments: ['Home', 'Society'], active: true },
    { id: 'u_priya', name: 'Priya Kulkarni', role: 'Sales', phone: '+91 90000 00012', areas: ['Indira Nagar', 'CIDCO', 'Pathardi Phata', 'Dwarka', 'Adgaon'], segments: ['Home', 'Society'], active: true },
    { id: 'u_rohit', name: 'Rohit Jadhav', role: 'Sales', phone: '+91 90000 00013', areas: ['Satpur MIDC', 'Ambad MIDC', 'Sinnar', 'Malegaon'], segments: ['Factory', 'Shop', 'Institution'], active: true },
    { id: 'u_sagar', name: 'Sagar Pawar', role: 'Sales', phone: '+91 90000 00014', areas: ['Nashik Road', 'Deolali Camp', 'Panchavati', 'Niphad', 'Ozar', 'Dindori', 'Igatpuri'], segments: ['Home', 'Farm'], active: true },
    { id: 'u_ganesh', name: 'Ganesh More', role: 'Surveyor', phone: '+91 90000 00021', areas: ['West', 'Industrial'], active: true },
    { id: 'u_vishal', name: 'Vishal Shinde', role: 'Surveyor', phone: '+91 90000 00022', areas: ['East', 'North'], active: true }
  ];

  const STAGES = ['New', 'Contacted', 'Qualified', 'Site Survey', 'Quotation Sent', 'Negotiation', 'Won', 'Lost'];
  const POST_SALE = ['Portal registered', 'DISCOM feasibility', 'Installed', 'Net meter fitted', 'Subsidy credited'];
  const SOURCES = ['Meta Ads', 'Google Ads', 'Website', 'Missed call', 'Referral', 'Walk-in', 'JustDial', 'IndiaMART', 'Excel import'];
  const TYPES = ['Home', 'Society', 'Shop', 'Factory', 'Institution', 'Farm'];
  const OBJECTIONS = ['Price', 'Monsoon / cloudy days', 'Getting other quotes', 'Call later', 'Committee approval', 'Rented property', 'Roof space', 'Subsidy delay worry', 'Maintenance'];

  const KNOWLEDGE = {
    subsidy: 'PM Surya Ghar: ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, maximum ₹78,000 (3 kW and above). Housing societies/RWAs: ₹18,000/kW for common facilities, up to 500 kW. Paid by direct bank transfer after commissioning.',
    msedcl: 'Since 13 Feb 2026 the MSEDCL portal caps subsidised residential capacity by the last 12 months of consumption. Always ask for the last 12 months of bills or consumer number before promising a size.',
    almm: 'From 1 June 2026 subsidised net-metering projects must use modules made with ALMM List-II (domestic) cells.',
    generation: 'Nashik: about 4 units per kW per day, about 1,400–1,500 units per kW per year. Monsoon generation drops roughly 30–40% but does not stop. Net metering banks summer surplus.',
    roof: 'About 80–100 sq ft of shadow-free roof per kW.',
    loan: 'Public-sector banks offer rooftop solar loans at roughly 7% for systems up to 3 kW (confirm current rate with the bank).',
    timeline: 'Portal registration → DISCOM feasibility (days to 2 weeks) → installation (2–3 days) → net meter (1–4 weeks) → subsidy credit (typically 30–90 days).',
    commercial: 'Commercial/industrial: no PM Surya Ghar subsidy; daytime load makes payback fast; accelerated depreciation may apply (confirm with CA).'
  };

  const q = (field, mr, hi, en, required) => ({ id: 'q_' + field, field, text: { mr, hi, en }, required: required !== false });
  const DEFAULT_QUESTIONS = [
    q('bill', 'तुमचं महिन्याचं लाईट बिल साधारण किती येतं?', 'आपका महीने का बिजली बिल लगभग कितना आता है?', 'What is your average monthly electricity bill?'),
    q('type', 'हे घर आहे, दुकान, सोसायटी की कारखाना?', 'यह घर है, दुकान, सोसायटी या फ़ैक्ट्री?', 'Is this for a home, shop, housing society or factory?'),
    q('roofOwn', 'छत स्वतःच्या मालकीची आहे का?', 'क्या छत आपकी अपनी है?', 'Do you own the roof?'),
    q('roofArea', 'गच्चीवर साधारण किती मोकळी जागा आहे?', 'छत पर लगभग कितनी खाली जगह है?', 'Roughly how much free roof space is there?'),
    q('area', 'तुम्ही नाशिकमध्ये कोणत्या भागात राहता?', 'आप नासिक में किस इलाके में रहते हैं?', 'Which area of Nashik are you in?'),
    q('history', 'मागील 12 महिन्यांचे बिल किंवा MSEDCL ग्राहक क्रमांक उपलब्ध आहे का?', 'क्या पिछले 12 महीने के बिल या MSEDCL कंज़्यूमर नंबर उपलब्ध है?', 'Do you have the last 12 months of bills or your MSEDCL consumer number?'),
    q('finance', 'सबसिडी किंवा EMI/कर्जाबद्दल माहिती हवी आहे का?', 'क्या आपको सब्सिडी या EMI/लोन की जानकारी चाहिए?', 'Are you interested in subsidy or EMI/loan?', false),
    q('timeline', 'सोलर कधीपर्यंत बसवायचा विचार आहे?', 'सोलर कब तक लगवाने का सोच रहे हैं?', 'When are you planning to install?'),
    q('visitSlot', 'मोफत साइट सर्व्हेसाठी कोणती वेळ सोयीची आहे?', 'मुफ़्त साइट सर्वे के लिए कौन सा समय ठीक रहेगा?', 'What time suits you for a free site survey?')
  ];

  const DEFAULT_OBJECTIONS = [
    { trigger: 'Price', keywords: ['महाग', 'महँगा', 'महंगा', 'expensive', 'costly', 'price', 'किंमत', 'कीमत', 'budget'],
      mr: 'समजतं. बरेच ग्राहक EMI वर घेतात — सरकारी बँकांकडून साधारण 7% दराने कर्ज मिळतं आणि EMI बहुतेक वेळा सध्याच्या बिलाइतकाच असतो. साधारण 4–5 वर्षांत खर्च वसूल होतो.',
      hi: 'समझ {सकती|सकता} हूँ। ज़्यादातर ग्राहक EMI पर लेते हैं — सरकारी बैंकों से लगभग 7% पर लोन मिलता है और EMI अक्सर अभी के बिल जितनी होती है। 4–5 साल में खर्च वसूल हो जाता है।',
      en: 'I understand. Most customers choose EMI — public-sector banks offer about 7% loans and the EMI is often close to the current bill. Payback is typically 4–5 years.' },
    { trigger: 'Monsoon / cloudy days', keywords: ['पाऊस', 'पावसा', 'बारिश', 'monsoon', 'rain', 'ढग', 'बादल', 'cloud'],
      mr: 'पावसाळ्यात निर्मिती साधारण 30–40% कमी होते, पण थांबत नाही. नेट मीटरिंगमुळे उन्हाळ्यातील जास्तीचे युनिट्स MSEDCL कडे जमा राहतात आणि वर्षभराचा हिशोब होतो.',
      hi: 'बारिश में उत्पादन लगभग 30–40% कम होता है, पर रुकता नहीं। नेट मीटरिंग से गर्मी के ज़्यादा यूनिट MSEDCL के पास जमा रहते हैं और सालभर का हिसाब होता है।',
      en: 'Generation drops about 30–40% in monsoon but does not stop. Net metering banks the summer surplus with MSEDCL and settles it over the year.' },
    { trigger: 'Getting other quotes', keywords: ['quote', 'कोटेशन', 'दुसरे', 'दूसरे', 'other company', 'compare'],
      mr: 'नक्की तुलना करा. आमचा इंजिनिअर मोफत सर्व्हे करून छताचं अचूक मोजमाप आणि लेखी बचत अंदाज देईल — त्यामुळे तुलना सोपी होईल.',
      hi: 'ज़रूर तुलना कीजिए। हमारे इंजीनियर मुफ़्त सर्वे करके छत का सही माप और लिखित बचत अनुमान देंगे — इससे तुलना आसान होगी।',
      en: 'Please do compare. Our engineer will do a free survey and give you exact roof measurements and a written savings estimate, which makes comparison easy.' },
    { trigger: 'Call later', keywords: ['नंतर', 'बाद में', 'later', 'busy', 'कामात', 'व्यस्त'],
      mr: 'काही हरकत नाही. तुम्हाला कधी परत कॉल करू? एक निश्चित वेळ सांगा.',
      hi: 'कोई बात नहीं। आपको कब दोबारा कॉल करूँ? कोई तय समय बता दीजिए।',
      en: 'No problem. When should I call you back? Please give me an exact time.' },
    { trigger: 'Rented property', keywords: ['भाड्या', 'किराए', 'किराये', 'rent', 'tenant'],
      mr: 'रूफटॉप सोलरसाठी छताच्या मालकाची परवानगी आणि वीज कनेक्शन मालकाच्या नावावर असणं गरजेचं असतं. घरमालकांशी बोलायला आम्ही मदत करू शकतो.',
      hi: 'रूफटॉप सोलर के लिए छत के मालिक की अनुमति और बिजली कनेक्शन मालिक के नाम पर होना ज़रूरी है। मकान-मालिक से बात करने में हम मदद कर सकते हैं।',
      en: 'Rooftop solar needs the owner\'s permission and the connection in the owner\'s name. We can help you talk to your landlord.' },
    { trigger: 'Committee approval', keywords: ['कमिटी', 'committee', 'सभा', 'AGM', 'मेंबर'],
      mr: 'आमचे सेल्स हेड कमिटी मीटिंगमध्ये येऊन बचतीचं प्रेझेंटेशन देतील आणि सदस्यांच्या प्रश्नांची उत्तरं देतील.',
      hi: 'हमारे सेल्स हेड कमेटी मीटिंग में आकर बचत का प्रेज़ेंटेशन देंगे और सदस्यों के सवालों के जवाब देंगे।',
      en: 'Our sales head can attend your committee meeting, present the savings and answer members\' questions.' },
    { trigger: 'Maintenance', keywords: ['मेंटेनन्स', 'देखभाल', 'maintenance', 'साफ', 'clean', 'warranty', 'वॉरंटी'],
      mr: 'पॅनलवर 25 वर्षांची परफॉर्मन्स वॉरंटी असते. महिन्यातून दोनदा पाण्याने साफ करणं पुरेसं आहे; आमचे AMC प्लॅनही उपलब्ध आहेत.',
      hi: 'पैनल पर 25 साल की परफ़ॉर्मेंस वारंटी होती है। महीने में दो बार पानी से साफ़ करना काफ़ी है; हमारे AMC प्लान भी उपलब्ध हैं।',
      en: 'Panels carry a 25-year performance warranty. Rinsing twice a month is enough, and AMC plans are available.' }
  ];

  const FAQS = [
    { q: 'How much subsidy will I get?', a: KNOWLEDGE.subsidy },
    { q: 'How big a system can I install?', a: KNOWLEDGE.msedcl },
    { q: 'Will it work in monsoon?', a: KNOWLEDGE.generation },
    { q: 'How much roof space is needed?', a: KNOWLEDGE.roof },
    { q: 'Is a loan / EMI available?', a: KNOWLEDGE.loan },
    { q: 'How long does the whole process take?', a: KNOWLEDGE.timeline },
    { q: 'Which panels do you use?', a: KNOWLEDGE.almm + ' Solaris to add brand list and warranty terms.' },
    { q: 'What about shops and factories?', a: KNOWLEDGE.commercial }
  ];

  const baseAgent = (o) => Object.assign({
    status: 'Active', direction: 'Inbound', primaryLang: 'mr', languages: ['mr', 'hi', 'en'], autoDetect: true,
    voice: { gender: 'f', rate: 1, pitch: 1 }, maxMinutes: 6, hours: { start: '10:00', end: '19:00' },
    retries: { attempts: 3, gapHours: 4 }, transfer: { score: 75, keywords: ['sales', 'manager', 'माणूस', 'इंसान', 'human'], mode: 'Live transfer' },
    compliance: { aiDisclosure: true, recordingDisclosure: true, dncOnRequest: true, consentOnly: true },
    questions: JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)), objections: JSON.parse(JSON.stringify(DEFAULT_OBJECTIONS)),
    tone: 'Warm, respectful, short sentences. Uses "जी" / "आपण". Never pushy.', number: '+91 20 4000 1100'
  }, o);

  const CALL_TYPES = [
    { id: 'enquiry', name: 'New solar enquiry (inbound call or missed call)', how: 'Greet, find out need, qualify (bill, property, roof, area, 12-month bills, finance, timeline), handle objections, book a free site survey.', on: true },
    { id: 'outbound', name: 'Calling new leads (ads, website, Excel lists)', how: 'Remind them they enquired, ask for 2 minutes, then qualify and book a survey. If busy, fix an exact callback time.', on: true },
    { id: 'commercial', name: 'Housing societies, shops, factories, hospitals, schools', how: 'Ask common-meter or monthly bill, connection type (LT/HT), day-time load, roof type/size, decision maker. Societies: ₹18,000/kW RWA subsidy, offer committee-meeting presentation. Hot commercial: live transfer to commercial salesperson.', on: true },
    { id: 'support', name: 'Existing customers: subsidy status, net meter, service complaint', how: 'Take consumer number or registered mobile, tell only what the after-sale tracker shows, never guess, raise a ticket and promise a callback time.', on: true },
    { id: 'visit', name: 'Site-visit confirmation and rescheduling', how: 'Confirm tomorrow\'s visit time, remind to keep 12-month bills and terrace access ready, reschedule if needed.', on: true },
    { id: 'quote', name: 'Quotation follow-up and payment reminders', how: 'Ask if they received the quotation, answer basic questions, collect concerns, book a call with the salesperson for price negotiation. Never change prices.', on: true },
    { id: 'nurture', name: 'Nurture and win-back calls', how: 'Polite check-in after 30/90 days, remind subsidy is available, offer a free survey. Stop if not interested.', on: true }
  ];

  const AGENTS = [
    baseAgent({ id: 'ag_one', name: 'Asha', allInOne: true, useCase: 'One agent for all Solaris calls — enquiries, outbound leads, societies & factories, customer support, visit confirmation, quotation follow-up', direction: 'Both', primaryLang: 'mr', voice: { gender: 'f', rate: 1, pitch: 1.05 }, maxMinutes: 8, style: 'Spoken Marathi', callTypes: JSON.parse(JSON.stringify(CALL_TYPES)),
      tone: 'Simple spoken Marathi as people speak in Nashik (बोलीभाषा), respectful "तुम्ही / आपण", short sentences, warm and patient with elders. Never pushy.',
      transfer: { score: 75, keywords: ['sales', 'manager', 'माणूस', 'साहेब', 'इंसान', 'human', 'मालक'], mode: 'Live transfer' },
      greeting: { mr: 'नमस्कार! मी Solaris ची AI सहाय्यक आशा बोलतेय. हा कॉल गुणवत्तेसाठी रेकॉर्ड होतोय. बोला, मी तुमची काय मदत करू?', hi: 'नमस्ते! मैं Solaris की AI असिस्टेंट आशा बोल रही हूँ। यह कॉल क्वालिटी के लिए रिकॉर्ड हो रही है। बताइए, मैं आपकी क्या मदद करूँ?', en: 'Hello! I am Asha, Solaris\' AI assistant. This call is recorded for quality. How can I help you today?' },
      greetingOut: { mr: 'नमस्कार {name} जी! मी Solaris ची AI सहाय्यक आशा बोलतेय. हा कॉल रेकॉर्ड होतोय. तुम्ही सोलरसाठी चौकशी केली होती, दोन मिनिटं बोलू शकतो का?', hi: 'नमस्ते {name} जी! मैं Solaris की AI असिस्टेंट आशा बोल रही हूँ। यह कॉल रिकॉर्ड हो रही है। आपने सोलर के लिए पूछताछ की थी, क्या दो मिनट बात कर सकते हैं?', en: 'Hello {name}! This is Asha, Solaris\' AI assistant. This call is recorded. You enquired about solar — do you have two minutes?' } }),
    baseAgent({ id: 'ag_sakhi', name: 'Sakhi', useCase: 'Inbound enquiries & missed-call callback', direction: 'Inbound', primaryLang: 'mr', voice: { gender: 'f', rate: 1, pitch: 1.05 },
      greeting: { mr: 'नमस्कार! मी Solaris ची AI सहाय्यक सखी बोलतेय. हा कॉल गुणवत्तेसाठी रेकॉर्ड केला जातोय. मी तुमची कशी मदत करू?', hi: 'नमस्ते! मैं Solaris की AI असिस्टेंट सखी बोल रही हूँ। यह कॉल क्वालिटी के लिए रिकॉर्ड हो रही है। मैं आपकी क्या मदद कर सकती हूँ?', en: 'Hello! I am Sakhi, Solaris\' AI assistant. This call is recorded for quality. How can I help you?' } }),
    baseAgent({ id: 'ag_arjun', name: 'Arjun', useCase: 'Outbound calling to ad, website & Excel leads', direction: 'Outbound', primaryLang: 'hi', voice: { gender: 'm', rate: 1, pitch: 0.95 },
      greeting: { mr: 'नमस्कार {name} जी! मी Solaris चा AI सहाय्यक अर्जुन बोलतोय. हा कॉल रेकॉर्ड होत आहे. तुम्ही सोलरसाठी चौकशी केली होती, दोन मिनिटं बोलू शकतो का?', hi: 'नमस्ते {name} जी! मैं Solaris का AI असिस्टेंट अर्जुन बोल रहा हूँ। यह कॉल रिकॉर्ड हो रही है। आपने सोलर के लिए पूछताछ की थी, क्या दो मिनट बात कर सकते हैं?', en: 'Hello {name}! I am Arjun, Solaris\' AI assistant. This call is recorded. You enquired about solar — do you have two minutes?' } }),
    baseAgent({ id: 'ag_meera', name: 'Meera', useCase: 'Housing societies, shops & factories (bill above ₹15,000)', direction: 'Both', primaryLang: 'mr', voice: { gender: 'f', rate: 0.95, pitch: 1 }, maxMinutes: 10,
      transfer: { score: 65, keywords: ['sales', 'manager', 'quotation', 'कोटेशन'], mode: 'Live transfer' },
      greeting: { mr: 'नमस्कार! मी Solaris ची AI सहाय्यक मीरा बोलतेय, कमर्शियल आणि सोसायटी सोलरसाठी. हा कॉल रेकॉर्ड होत आहे.', hi: 'नमस्ते! मैं Solaris की AI असिस्टेंट मीरा बोल रही हूँ, कमर्शियल और सोसायटी सोलर के लिए। यह कॉल रिकॉर्ड हो रही है।', en: 'Hello! This is Meera, Solaris\' AI assistant for commercial and society solar. This call is recorded.' } }),
    baseAgent({ id: 'ag_seva', name: 'Seva', useCase: 'Existing customers: subsidy, net-meter & service status', direction: 'Inbound', primaryLang: 'mr', voice: { gender: 'f', rate: 1, pitch: 1 },
      transfer: { score: 101, keywords: ['complaint', 'तक्रार', 'शिकायत', 'manager'], mode: 'Create ticket + callback' },
      greeting: { mr: 'नमस्कार, Solaris मध्ये आपलं स्वागत. मी AI सहाय्यक सेवा. हा कॉल रेकॉर्ड होत आहे. मी आपली कशी मदत करू?', hi: 'नमस्ते, Solaris में आपका स्वागत है। मैं AI असिस्टेंट सेवा। यह कॉल रिकॉर्ड हो रही है। मैं आपकी क्या मदद करूँ?', en: 'Welcome to Solaris. I am Seva, an AI assistant. This call is recorded. How may I help?' } }),
    baseAgent({ id: 'ag_smita', name: 'Smita', status: 'Paused', useCase: 'Site-visit confirmation & reminder calls', direction: 'Outbound', primaryLang: 'mr', voice: { gender: 'f', rate: 1.05, pitch: 1.05 }, maxMinutes: 2,
      greeting: { mr: 'नमस्कार {name} जी, मी Solaris ची AI सहाय्यक स्मिता. उद्याच्या साइट सर्व्हेची वेळ कन्फर्म करण्यासाठी कॉल केला आहे.', hi: 'नमस्ते {name} जी, मैं Solaris की AI असिस्टेंट स्मिता। कल के साइट सर्वे का समय कन्फ़र्म करने के लिए कॉल किया है।', en: 'Hello {name}, this is Smita from Solaris. Calling to confirm tomorrow\'s site survey.' } })
  ];

  const WA_TEMPLATES = [
    { id: 'wa_brochure', name: 'Brochure + savings estimate', body: 'नमस्कार {name} जी, Solaris मध्ये चौकशीसाठी धन्यवाद! तुमच्या ₹{bill} बिलावर {kw} kW सिस्टीमने साधारण ₹{yearSave}/वर्ष बचत होऊ शकते. ब्रोशर सोबत जोडले आहे.' },
    { id: 'wa_visit', name: 'Site visit confirmation', body: 'नमस्कार {name} जी, तुमचा मोफत साइट सर्व्हे {date} रोजी {time} वाजता निश्चित झाला आहे. सर्व्हेयर: {surveyor}. कृपया मागील 12 महिन्यांचे लाईट बिल तयार ठेवा.' },
    { id: 'wa_remind', name: 'Visit reminder (T-2h)', body: 'आठवण: आज {time} वाजता Solaris चे सर्व्हेयर {surveyor} तुमच्याकडे येतील. वेळ बदलायची असल्यास या मेसेजला उत्तर द्या.' },
    { id: 'wa_quote', name: 'Quotation follow-up', body: 'नमस्कार {name} जी, तुमचे {kw} kW सिस्टीमचे कोटेशन पाठवले आहे. काही प्रश्न असल्यास {sales} तुम्हाला कॉल करतील.' },
    { id: 'wa_nurture', name: '30-day nurture', body: 'नमस्कार {name} जी, PM सूर्य घर योजनेत ₹78,000 पर्यंत सबसिडी अजूनही उपलब्ध आहे. मोफत सर्व्हे बुक करायचा असल्यास "हो" लिहा.' }
  ];

  const CADENCE = [
    { id: 'c1', trigger: 'New lead (ad / website / Excel)', action: 'AI call within 2 minutes (in calling hours)', channel: 'AI call', on: true },
    { id: 'c2', trigger: 'No answer', action: 'Retry AI call after 4 h, max 3 attempts, then WhatsApp', channel: 'AI call', on: true },
    { id: 'c3', trigger: 'Qualified, no visit booked', action: 'WhatsApp brochure now → AI call on Day 1 and Day 3 → sales call Day 7', channel: 'Mixed', on: true },
    { id: 'c4', trigger: 'Customer asks to call later', action: 'AI call at the exact slot the customer named', channel: 'AI call', on: true },
    { id: 'c5', trigger: 'Site visit booked', action: 'WhatsApp T-24 h, AI confirmation call T-3 h, WhatsApp T-2 h', channel: 'Mixed', on: true },
    { id: 'c6', trigger: 'Survey completed', action: 'Sales call + quotation within 24 h, WhatsApp follow-up Day 2', channel: 'Sales', on: true },
    { id: 'c7', trigger: 'Nurture (rented / not now)', action: 'WhatsApp every 30 days, AI call at 90 days', channel: 'Mixed', on: true },
    { id: 'c8', trigger: 'Customer says “do not call”', action: 'Add to DNC list, stop every sequence', channel: 'System', on: true }
  ];

  /* ---------- Call scripts: {g_f|g_m} picks the agent's grammatical gender ---------- */
  const S = {};
  S.res_hot = {
    outcome: 'Visit booked', types: ['Home'], stageTo: 'Site Survey', objection: 'Price',
    mr: [
      ['ai', 'नमस्कार {name} जी! मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. हा कॉल गुणवत्तेसाठी रेकॉर्ड केला जातोय. तुम्ही सोलरसाठी चौकशी केली होती, दोन मिनिटं बोलू शकतो का?'],
      ['cust', 'हो, बोला.'],
      ['ai', 'धन्यवाद! तुमचं महिन्याचं लाईट बिल साधारण किती येतं?'],
      ['cust', 'साधारण {bill} रुपये येतं. उन्हाळ्यात थोडं जास्त.', { bill: 1 }],
      ['ai', 'हे स्वतःचं घर आहे का? गच्चीवर साधारण किती जागा मोकळी आहे?'],
      ['cust', 'स्वतःचा बंगला आहे, {areaDv} ला. गच्ची साधारण {roof} स्क्वेअर फूट आहे.', { type: 1, roofOwn: 1, area: 1, roofArea: 1 }],
      ['ai', 'छान. तुमच्या बिलावरून साधारण {kw} किलोवॅटची सिस्टीम बसेल. PM सूर्य घर योजनेतून ₹{subsidy} पर्यंत सबसिडी थेट बँक खात्यात मिळते.', { sizeKw: 1 }],
      ['cust', 'पण सोलर खूप महाग आहे ना?', { objection: 'Price' }],
      ['ai', 'समजतं. बरेच ग्राहक EMI वर घेतात — सरकारी बँकांकडून साधारण 7% दराने कर्ज मिळतं आणि EMI बहुतेक वेळा सध्याच्या बिलाइतकाच असतो. साधारण 4–5 वर्षांत खर्च वसूल होतो.', { finance: 'Loan / EMI' }],
      ['cust', 'अच्छा. मग पुढे काय करायचं?'],
      ['ai', 'आमचे इंजिनिअर मोफत साइट सर्व्हे करून नेमकी बचत सांगतील. {visitDayDv} {visitTimeMr} चालेल का?'],
      ['cust', 'हो, {visitDayDv} या.', { visit: 1, timeline: 'This month' }],
      ['ai', 'नक्की. {visitDayDv} {visitTimeMr} सर्व्हे बुक केला आहे. WhatsApp वर कन्फर्मेशन {पाठवते|पाठवतो}. मागील 12 महिन्यांचं लाईट बिल तयार ठेवा — MSEDCL आता त्यावरूनच क्षमता ठरवतं. धन्यवाद!', { history: 'Asked to keep 12-month bills' }]
    ],
    hi: [
      ['ai', 'नमस्ते {name} जी! मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। यह कॉल क्वालिटी के लिए रिकॉर्ड हो रही है। आपने सोलर के लिए पूछताछ की थी, क्या दो मिनट बात कर सकते हैं?'],
      ['cust', 'हाँ, बोलिए।'],
      ['ai', 'धन्यवाद! आपका महीने का बिजली बिल लगभग कितना आता है?'],
      ['cust', 'लगभग {bill} रुपये आता है, गर्मी में थोड़ा ज़्यादा।', { bill: 1 }],
      ['ai', 'क्या यह आपका अपना घर है? छत पर लगभग कितनी खाली जगह है?'],
      ['cust', 'अपना घर है, {areaDv} में। छत करीब {roof} स्क्वेयर फ़ीट होगी।', { type: 1, roofOwn: 1, area: 1, roofArea: 1 }],
      ['ai', 'बढ़िया। आपके बिल के हिसाब से लगभग {kw} किलोवॉट का सिस्टम सही रहेगा। PM सूर्य घर योजना में ₹{subsidy} तक की सब्सिडी सीधे बैंक खाते में आती है।', { sizeKw: 1 }],
      ['cust', 'लेकिन सोलर बहुत महँगा होता है ना?', { objection: 'Price' }],
      ['ai', 'समझ {सकती|सकता} हूँ। ज़्यादातर ग्राहक EMI पर लेते हैं — सरकारी बैंकों से लगभग 7% पर लोन मिलता है और EMI अक्सर आपके अभी के बिल जितनी होती है। 4–5 साल में खर्च वसूल हो जाता है।', { finance: 'Loan / EMI' }],
      ['cust', 'ठीक है। तो आगे क्या करना होगा?'],
      ['ai', 'हमारे इंजीनियर मुफ़्त साइट सर्वे करके सही बचत बताएँगे। {visitDayHi} {visitTimeHi} ठीक रहेगा?'],
      ['cust', 'हाँ, {visitDayHi} को आ जाइए।', { visit: 1, timeline: 'This month' }],
      ['ai', 'पक्का। {visitDayHi} {visitTimeHi} सर्वे बुक हो गया है। WhatsApp पर कन्फ़र्मेशन भेज {रही|रहा} हूँ। पिछले 12 महीने के बिजली बिल तैयार रखिए — MSEDCL अब उसी के आधार पर क्षमता तय करता है। धन्यवाद!', { history: 'Asked to keep 12-month bills' }]
    ]
  };
  S.res_callback = {
    outcome: 'Callback', types: ['Home'], stageTo: 'Qualified', objection: 'Monsoon / cloudy days',
    mr: [
      ['ai', 'नमस्कार {name} जी, मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. हा कॉल रेकॉर्ड होत आहे. तुम्ही वेबसाइटवर सोलरची माहिती मागवली होती.'],
      ['cust', 'हो, पण आमच्याकडे पावसाळ्यात चार महिने ऊनच नसतं. मग सोलरचा काय फायदा?', { objection: 'Monsoon / cloudy days' }],
      ['ai', 'चांगला प्रश्न. पावसाळ्यात निर्मिती साधारण 30–40% कमी होते, पण ढगाळ वातावरणातही पॅनल वीज बनवतात. नेट मीटरिंगमुळे उन्हाळ्यातले जास्तीचे युनिट्स MSEDCL कडे जमा राहतात आणि वर्षभराचा हिशोब होतो.'],
      ['cust', 'अच्छा. आमचं बिल साधारण {bill} येतं.', { bill: 1 }],
      ['ai', 'मग वर्षाला साधारण ₹{yearSave} पर्यंत बचत होऊ शकते. घर स्वतःचं आहे का?', { sizeKw: 1 }],
      ['cust', 'हो, {areaDv} ला फ्लॅट आहे, पण गच्ची सोसायटीची आहे. आणि मला घरच्यांशी बोलायचं आहे.', { type: 1, area: 1, roofOwn: 1 }],
      ['ai', 'नक्कीच. मी तुम्हाला कधी परत कॉल करू? उद्या संध्याकाळी 6 वाजता चालेल का?'],
      ['cust', 'परवा संध्याकाळी करा.', { callback: 1, timeline: '1–3 months' }],
      ['ai', 'ठीक आहे, परवा संध्याकाळी 6 वाजता कॉल {करते|करतो}. तोपर्यंत WhatsApp वर बचतीचा अंदाज {पाठवते|पाठवतो}. धन्यवाद!']
    ],
    hi: [
      ['ai', 'नमस्ते {name} जी, मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। यह कॉल रिकॉर्ड हो रही है। आपने वेबसाइट पर सोलर की जानकारी माँगी थी।'],
      ['cust', 'हाँ, पर बारिश में चार महीने धूप ही नहीं रहती। फिर सोलर का क्या फ़ायदा?', { objection: 'Monsoon / cloudy days' }],
      ['ai', 'अच्छा सवाल है। बारिश में उत्पादन लगभग 30–40% कम होता है, पर बादलों में भी पैनल बिजली बनाते हैं। नेट मीटरिंग से गर्मी के ज़्यादा यूनिट MSEDCL के पास जमा रहते हैं और सालभर का हिसाब होता है।'],
      ['cust', 'अच्छा। हमारा बिल लगभग {bill} आता है।', { bill: 1 }],
      ['ai', 'तो साल में लगभग ₹{yearSave} तक की बचत हो सकती है। क्या घर आपका अपना है?', { sizeKw: 1 }],
      ['cust', 'हाँ, {areaDv} में फ़्लैट है, पर छत सोसायटी की है। और मुझे घरवालों से बात करनी है।', { type: 1, area: 1, roofOwn: 1 }],
      ['ai', 'ज़रूर। आपको कब दोबारा कॉल करूँ? कल शाम 6 बजे ठीक रहेगा?'],
      ['cust', 'परसों शाम को कीजिए।', { callback: 1, timeline: '1–3 months' }],
      ['ai', 'ठीक है, परसों शाम 6 बजे कॉल {करूँगी|करूँगा}। तब तक WhatsApp पर बचत का अनुमान भेज {रही|रहा} हूँ। धन्यवाद!']
    ]
  };
  S.society = {
    outcome: 'Meeting booked', types: ['Society'], stageTo: 'Site Survey', objection: 'Committee approval',
    mr: [
      ['ai', 'नमस्कार, मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. कॉल रेकॉर्ड होत आहे. आपण सोसायटीसाठी सोलरची चौकशी केली होती ना?'],
      ['cust', 'हो, मी सोसायटीचा सेक्रेटरी बोलतोय. आमची 48 फ्लॅटची सोसायटी आहे, {areaDv} ला.', { type: 1, area: 1 }],
      ['ai', 'छान. लिफ्ट, पाण्याचे पंप, पार्किंग लाईट्स — कॉमन मीटरचं महिन्याचं बिल किती येतं?'],
      ['cust', 'साधारण {bill} रुपये. लिफ्ट आणि पंपाचं बिल जास्त आहे.', { bill: 1 }],
      ['ai', 'अशा सोसायट्यांना PM सूर्य घर योजनेत कॉमन सुविधांसाठी ₹18,000 प्रति किलोवॅट सबसिडी मिळते. तुमच्या बिलावरून साधारण {kw} किलोवॅट सिस्टीम लागेल आणि कॉमन बिल 70–80% पर्यंत कमी होऊ शकतं.', { sizeKw: 1 }],
      ['cust', 'पण हा निर्णय कमिटी घेते. सगळ्या मेंबर्सना समजवावं लागेल.', { objection: 'Committee approval', roofOwn: 1 }],
      ['ai', 'बरोबर. आमचे सेल्स हेड कमिटी मीटिंगमध्ये येऊन बचतीचं प्रेझेंटेशन देतील आणि प्रश्नांची उत्तरं देतील. या {visitDayDv} चालेल का?'],
      ['cust', '{visitDayDv} {visitTimeMr} मीटिंग आहेच, तेव्हाच या.', { visit: 1, timeline: '1–3 months' }],
      ['ai', 'उत्तम. {visitDayDv} {visitTimeMr} कमिटी मीटिंग बुक केली. मागील 12 महिन्यांचे कॉमन मीटरचे बिल आणि टेरेसचे फोटो WhatsApp वर पाठवाल का?', { history: 'Requested 12-month common-meter bills' }],
      ['cust', 'हो, पाठवतो.'],
      ['ai', 'धन्यवाद! {sales} तुमच्या संपर्कात राहतील.']
    ],
    hi: [
      ['ai', 'नमस्ते, मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। कॉल रिकॉर्ड हो रही है। आपने सोसायटी के लिए सोलर की पूछताछ की थी?'],
      ['cust', 'जी हाँ, मैं सोसायटी का सेक्रेटरी बोल रहा हूँ। हमारी 48 फ़्लैट की सोसायटी है, {areaDv} में।', { type: 1, area: 1 }],
      ['ai', 'बढ़िया। लिफ़्ट, पानी के पंप, पार्किंग लाइट — कॉमन मीटर का महीने का बिल कितना आता है?'],
      ['cust', 'लगभग {bill} रुपये। लिफ़्ट और पंप का बिल ज़्यादा है।', { bill: 1 }],
      ['ai', 'ऐसी सोसायटियों को PM सूर्य घर योजना में कॉमन सुविधाओं के लिए ₹18,000 प्रति किलोवॉट सब्सिडी मिलती है। आपके बिल के हिसाब से लगभग {kw} किलोवॉट सिस्टम लगेगा और कॉमन बिल 70–80% तक कम हो सकता है।', { sizeKw: 1 }],
      ['cust', 'लेकिन फ़ैसला कमेटी लेती है। सब मेंबर्स को समझाना पड़ेगा।', { objection: 'Committee approval', roofOwn: 1 }],
      ['ai', 'बिल्कुल। हमारे सेल्स हेड कमेटी मीटिंग में आकर बचत का प्रेज़ेंटेशन देंगे और सवालों के जवाब देंगे। इस {visitDayHi} ठीक रहेगा?'],
      ['cust', '{visitDayHi} {visitTimeHi} मीटिंग है ही, तभी आ जाइए।', { visit: 1, timeline: '1–3 months' }],
      ['ai', 'बहुत बढ़िया। {visitDayHi} {visitTimeHi} कमेटी मीटिंग बुक हो गई। क्या पिछले 12 महीने के कॉमन मीटर बिल और छत की फ़ोटो WhatsApp पर भेज देंगे?', { history: 'Requested 12-month common-meter bills' }],
      ['cust', 'हाँ, भेज दूँगा।'],
      ['ai', 'धन्यवाद! {sales} आपसे संपर्क में रहेंगे।']
    ]
  };
  S.factory = {
    outcome: 'Transferred', types: ['Factory', 'Shop', 'Institution'], stageTo: 'Qualified', objection: null,
    mr: [
      ['ai', 'नमस्कार, मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. हा कॉल रेकॉर्ड होत आहे. तुम्ही तुमच्या युनिटसाठी सोलरबद्दल विचारलं होतं.'],
      ['cust', 'हो, {name} कडून बोलतोय. {areaDv} मध्ये आमचा प्लांट आहे. महिन्याचं बिल साधारण {bill} आहे.', { type: 1, area: 1, bill: 1 }],
      ['ai', 'कनेक्शन HT आहे की LT? आणि काम दिवसा चालतं का?'],
      ['cust', 'LT इंडस्ट्रियल आहे. दोन शिफ्ट — सकाळी 8 ते रात्री 10. शेडचं छप्पर पत्र्याचं आहे, साधारण {roof} स्क्वेअर फूट.', { roofOwn: 1, roofArea: 1 }],
      ['ai', 'दिवसा वापर जास्त असल्याने सोलरचा पेबॅक लवकर होतो. साधारण {kw} किलोवॅटचा प्लांट विचारात घेता येईल. कमर्शियल प्लांटवर ॲक्सिलरेटेड डेप्रिसिएशनचा फायदाही मिळू शकतो — तुमच्या CA कडून खात्री करा.', { sizeKw: 1 }],
      ['cust', 'किंमत आणि पेबॅक किती? मला आत्ताच सविस्तर बोलायचं आहे.', { timeline: 'Immediately' }],
      ['ai', 'नक्कीच. मी तुम्हाला आमच्या कमर्शियल सेल्स हेड {sales} यांच्याशी आत्ता {जोडते|जोडतो}. एक मिनिट थांबा.', { transfer: 1 }],
      ['sys', 'कॉल {sales} कडे लाईव्ह ट्रान्सफर — AI सारांश सेल्स ॲपवर पाठवला'],
      ['sales', 'नमस्कार, मी {sales}. AI ने तुमचे डिटेल्स दिले आहेत — ₹{bill} बिल, {roof} स्क्वेअर फूट पत्र्याचं छप्पर. {visitDayDv} साइटला भेट देऊ का?'],
      ['cust', 'हो, {visitDayDv} {visitTimeMr} या.', { visit: 1 }]
    ],
    hi: [
      ['ai', 'नमस्ते, मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। यह कॉल रिकॉर्ड हो रही है। आपने अपनी यूनिट के लिए सोलर के बारे में पूछा था।'],
      ['cust', 'जी, {name} से बोल रहा हूँ। {areaDv} में हमारा प्लांट है। महीने का बिल लगभग {bill} है।', { type: 1, area: 1, bill: 1 }],
      ['ai', 'कनेक्शन HT है या LT? और काम दिन में चलता है?'],
      ['cust', 'LT इंडस्ट्रियल है। दो शिफ़्ट — सुबह 8 से रात 10। शेड की छत टिन की है, लगभग {roof} स्क्वेयर फ़ीट।', { roofOwn: 1, roofArea: 1 }],
      ['ai', 'दिन में खपत ज़्यादा है, इसलिए पेबैक जल्दी होगा। लगभग {kw} किलोवॉट का प्लांट सोचा जा सकता है। कमर्शियल प्लांट पर एक्सेलरेटेड डेप्रिसिएशन का फ़ायदा भी मिल सकता है — अपने CA से पुष्टि करें।', { sizeKw: 1 }],
      ['cust', 'क़ीमत और पेबैक कितना? मुझे अभी विस्तार से बात करनी है।', { timeline: 'Immediately' }],
      ['ai', 'ज़रूर। मैं आपको अभी हमारे कमर्शियल सेल्स हेड {sales} से {जोड़ रही|जोड़ रहा} हूँ। एक मिनट रुकिए।', { transfer: 1 }],
      ['sys', 'कॉल {sales} को लाइव ट्रांसफ़र — AI सारांश सेल्स ऐप पर भेजा'],
      ['sales', 'नमस्ते, मैं {sales}। AI ने आपकी डिटेल्स दे दी हैं — ₹{bill} बिल, {roof} स्क्वेयर फ़ीट टिन की छत। {visitDayHi} को साइट पर आ जाऊँ?'],
      ['cust', 'हाँ, {visitDayHi} {visitTimeHi} आइए।', { visit: 1 }]
    ]
  };
  S.subsidy = {
    outcome: 'Support ticket', types: ['Home'], stageTo: null, objection: 'Subsidy delay worry', existing: true,
    mr: [
      ['ai', 'नमस्कार, Solaris मध्ये आपलं स्वागत. मी AI सहाय्यक {agentDv}. हा कॉल रेकॉर्ड होत आहे. मी आपली कशी मदत करू?'],
      ['cust', 'मी {name}. तुमच्याकडून तीन महिन्यांपूर्वी सोलर बसवलं. अजून सबसिडी आली नाही.', { objection: 'Subsidy delay worry' }],
      ['ai', 'थांबावं लागतंय याबद्दल क्षमस्व. तुमचा MSEDCL ग्राहक क्रमांक किंवा नोंदणीकृत मोबाईल नंबर सांगाल का?'],
      ['cust', 'हाच नंबर नोंदणीकृत आहे.'],
      ['ai', 'धन्यवाद. आमच्या रेकॉर्डनुसार नेट मीटर बसवलं गेलं आहे आणि पोर्टलवर कमिशनिंग रिपोर्ट अपलोड झाला आहे. सबसिडी सरकारकडून थेट बँक खात्यात येते; याला साधारण 30 ते 90 दिवस लागतात.'],
      ['cust', 'पण बँक खातं बरोबर जोडलंय ना?'],
      ['ai', 'याची मी खात्रीने माहिती देऊ शकत नाही, म्हणून आमच्या सबसिडी टीमसाठी तिकीट तयार {करते|करतो}. उद्या संध्याकाळी 5 पर्यंत ते तुम्हाला कॉल करून बँक तपशील तपासतील.', { ticket: 1 }],
      ['cust', 'ठीक आहे.'],
      ['ai', 'तिकीट क्रमांक WhatsApp वर पाठवला आहे. आणखी काही मदत हवी आहे का?'],
      ['cust', 'नाही, धन्यवाद.']
    ],
    hi: [
      ['ai', 'नमस्ते, Solaris में आपका स्वागत है। मैं AI असिस्टेंट {agentDv}। यह कॉल रिकॉर्ड हो रही है। मैं आपकी क्या मदद करूँ?'],
      ['cust', 'मैं {name}। आपसे तीन महीने पहले सोलर लगवाया था। अभी तक सब्सिडी नहीं आई।', { objection: 'Subsidy delay worry' }],
      ['ai', 'इंतज़ार के लिए माफ़ी {चाहती|चाहता} हूँ। क्या आप अपना MSEDCL कंज़्यूमर नंबर या रजिस्टर्ड मोबाइल नंबर बताएँगे?'],
      ['cust', 'यही नंबर रजिस्टर्ड है।'],
      ['ai', 'धन्यवाद। हमारे रिकॉर्ड के अनुसार नेट मीटर लग चुका है और पोर्टल पर कमीशनिंग रिपोर्ट अपलोड हो गई है। सब्सिडी सरकार से सीधे बैंक खाते में आती है; इसमें आमतौर पर 30 से 90 दिन लगते हैं।'],
      ['cust', 'लेकिन बैंक खाता सही जुड़ा है ना?'],
      ['ai', 'यह मैं पक्के तौर पर नहीं बता {सकती|सकता}, इसलिए हमारी सब्सिडी टीम के लिए टिकट बना {रही|रहा} हूँ। कल शाम 5 बजे तक वे आपको कॉल करके बैंक डिटेल्स जाँच लेंगे।', { ticket: 1 }],
      ['cust', 'ठीक है।'],
      ['ai', 'टिकट नंबर WhatsApp पर भेज दिया है। और कोई मदद चाहिए?'],
      ['cust', 'नहीं, धन्यवाद।']
    ]
  };
  S.dnc = {
    outcome: 'DNC', types: ['Home'], stageTo: 'Lost', objection: null,
    mr: [
      ['ai', 'नमस्कार {name} जी, मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. हा कॉल रेकॉर्ड होत आहे. तुम्ही सोलरच्या जाहिरातीवर माहिती भरली होती.'],
      ['cust', 'मी चुकून फॉर्म भरला. मला सोलर नको आहे, पुन्हा कॉल करू नका.', { dnc: 1 }],
      ['ai', 'समजलं, त्रासाबद्दल क्षमस्व. तुमचा नंबर आमच्या "कॉल करू नका" यादीत टाकला आहे; पुन्हा कॉल येणार नाही. शुभ दिवस!']
    ],
    hi: [
      ['ai', 'नमस्ते {name} जी, मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। यह कॉल रिकॉर्ड हो रही है। आपने सोलर के विज्ञापन पर जानकारी भरी थी।'],
      ['cust', 'ग़लती से फ़ॉर्म भर दिया था। मुझे सोलर नहीं चाहिए, दोबारा कॉल मत कीजिए।', { dnc: 1 }],
      ['ai', 'समझ {गई|गया}, परेशानी के लिए माफ़ी। आपका नंबर हमारी "कॉल न करें" सूची में डाल दिया है; दोबारा कॉल नहीं आएगा। आपका दिन शुभ हो!']
    ]
  };
  S.rented = {
    outcome: 'Nurture', types: ['Home'], stageTo: 'Contacted', objection: 'Rented property',
    mr: [
      ['ai', 'नमस्कार {name} जी, मी Solaris ची AI सहाय्यक {agentDv} {बोलतेय|बोलतोय}. हा कॉल रेकॉर्ड होत आहे. तुम्ही सोलरबद्दल चौकशी केली होती.'],
      ['cust', 'हो, पण आम्ही {areaDv} ला भाड्याच्या फ्लॅटमध्ये राहतो. बिल {bill} येतं.', { area: 1, bill: 1, roofOwn: 1, objection: 'Rented property' }],
      ['ai', 'समजलं. रूफटॉप सोलरसाठी छताच्या मालकाची परवानगी आणि वीज कनेक्शन मालकाच्या नावावर असणं गरजेचं असतं. तुमच्या घरमालकांना यात रस असेल का?'],
      ['cust', 'माहीत नाही. पुढच्या वर्षी आम्ही स्वतःचं घर घेणार आहोत.', { timeline: '6+ months' }],
      ['ai', 'छान! मग तेव्हा आम्ही नक्की मदत करू. मी तुम्हाला 3 महिन्यांनी आठवण म्हणून कॉल केला तर चालेल का?'],
      ['cust', 'हो, चालेल.', { nurture: 1 }],
      ['ai', 'ठीक आहे. तोपर्यंत सोलरची माहिती WhatsApp वर {पाठवते|पाठवतो}. धन्यवाद!']
    ],
    hi: [
      ['ai', 'नमस्ते {name} जी, मैं Solaris {की|का} AI असिस्टेंट {agentDv} बोल {रही|रहा} हूँ। यह कॉल रिकॉर्ड हो रही है। आपने सोलर के बारे में पूछताछ की थी।'],
      ['cust', 'हाँ, पर हम {areaDv} में किराए के फ़्लैट में रहते हैं। बिल {bill} आता है।', { area: 1, bill: 1, roofOwn: 1, objection: 'Rented property' }],
      ['ai', 'समझ {गई|गया}। रूफटॉप सोलर के लिए छत के मालिक की अनुमति और बिजली कनेक्शन मालिक के नाम पर होना ज़रूरी है। क्या आपके मकान-मालिक इसमें रुचि लेंगे?'],
      ['cust', 'पता नहीं। अगले साल हम अपना घर लेने वाले हैं।', { timeline: '6+ months' }],
      ['ai', 'बहुत अच्छा! तब हम ज़रूर मदद करेंगे। क्या मैं 3 महीने बाद याद दिलाने के लिए कॉल कर {सकती|सकता} हूँ?'],
      ['cust', 'हाँ, ठीक है।', { nurture: 1 }],
      ['ai', 'ठीक है। तब तक सोलर की जानकारी WhatsApp पर भेज {रही|रहा} हूँ। धन्यवाद!']
    ]
  };

  /* ---------- Names for demo data ---------- */
  const FIRST = ['Rahul', 'Sneha', 'Vikram', 'Anjali', 'Sachin', 'Pooja', 'Mahesh', 'Kavita', 'Nilesh', 'Swati', 'Sandeep', 'Rupali', 'Prashant', 'Manisha', 'Yogesh', 'Shital', 'Ajay', 'Deepa', 'Kiran', 'Vaishali', 'Tushar', 'Ashwini', 'Hemant', 'Sunita', 'Amol', 'Rekha', 'Nitin', 'Jyoti', 'Suresh', 'Madhuri'];
  const LAST = ['Patil', 'Kulkarni', 'Deshpande', 'Jadhav', 'Pawar', 'Shinde', 'More', 'Bhosale', 'Gaikwad', 'Joshi', 'Sonawane', 'Wagh', 'Ahire', 'Chavan', 'Thakre', 'Borse', 'Nikam', 'Kale', 'Salunkhe', 'Aher', 'Agarwal', 'Sharma', 'Gupta', 'Jain'];
  const DV_FIRST = { Rahul: 'राहुल', Sneha: 'स्नेहा', Vikram: 'विक्रम', Anjali: 'अंजली', Sachin: 'सचिन', Pooja: 'पूजा', Mahesh: 'महेश', Kavita: 'कविता', Nilesh: 'निलेश', Swati: 'स्वाती', Sandeep: 'संदीप', Rupali: 'रुपाली', Prashant: 'प्रशांत', Manisha: 'मनीषा', Yogesh: 'योगेश', Shital: 'शीतल', Ajay: 'अजय', Deepa: 'दीपा', Kiran: 'किरण', Vaishali: 'वैशाली', Tushar: 'तुषार', Ashwini: 'अश्विनी', Hemant: 'हेमंत', Sunita: 'सुनीता', Amol: 'अमोल', Rekha: 'रेखा', Nitin: 'नितीन', Jyoti: 'ज्योती', Suresh: 'सुरेश', Madhuri: 'माधुरी' };
  const SOCIETIES = ['Shree Ganesh CHS', 'Tulsi Vihar CHS', 'Sai Darshan Apartments', 'Godavari Heights CHS', 'Anandvan Residency', 'Kalpataru Park CHS', 'Mangalmurti CHS', 'Swami Samarth Nagar CHS', 'Parijat Apartments', 'Sahyadri Heights CHS', 'Riddhi Siddhi Residency', 'Shivneri Park CHS'];
  const FIRMS = ['Patil Industries', 'Sahyadri Auto Components', 'Nashik Precision Tools', 'Godavari Cold Storage', 'Shivam Plastics', 'Krishna Grapes Processing', 'Trimurti Engineering Works', 'Vighnaharta Packaging', 'Deccan Forgings', 'Mahalaxmi Food Products', 'Om Castings', 'Sai Krupa Rubber Industries', 'Om Sai Hospital', 'Vidya Prabodhini School', 'Mauli Hardware Store', 'Nandini Dairy Chilling Centre'];

  window.SOL_DATA = { CALL_TYPES, AREAS, TEAM, STAGES, POST_SALE, SOURCES, TYPES, OBJECTIONS, KNOWLEDGE, FAQS, AGENTS, WA_TEMPLATES, CADENCE, SCRIPTS: S, DEFAULT_QUESTIONS, DEFAULT_OBJECTIONS, FIRST, LAST, DV_FIRST, SOCIETIES, FIRMS };
})();
