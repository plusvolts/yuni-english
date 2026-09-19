/*
 * 윤이 영어 — 학습 콘텐츠
 * ------------------------------------------------------------
 * 아빠가 직접 고치는 파일이에요.
 *  - 단어 추가: words 배열에 { en, ko, img } 한 줄 추가 (img = 이모지)
 *  - alt: 아이 발음이 이렇게 인식돼도 정답으로 인정할 단어들 (선택)
 *  - photo: 'photos/dad.jpg' 처럼 넣으면 이모지 대신 사진 표시 (선택)
 *  - questions: 대화 질문. keywords 중 하나라도 들리면 정답
 *    {NAME} {AGE} {HYUN_REL} 은 아빠 화면 설정값으로 바뀜
 *  - 고친 뒤 sw.js 의 VERSION 숫자를 올려야 설치된 앱에 반영돼요.
 */
window.CONTENT = {
  topics: [
    {
      id: 'me', title: '나', en: 'Me', icon: '🙋', sticker: '🌟',
      words: [
        { en: 'hello', ko: '안녕', img: '👋' },
        { en: 'name', ko: '이름', img: '📛' },
        { en: 'boy', ko: '남자아이', img: '👦' },
        { en: 'girl', ko: '여자아이', img: '👧' },
        { en: 'friend', ko: '친구', img: '🧑‍🤝‍🧑' },
        { en: 'happy', ko: '행복한', img: '😊' },
        { en: 'yes', ko: '네', img: '⭕' },
        { en: 'no', ko: '아니요', img: '❌' },
        { en: 'me', ko: '나', img: '🙋' },
        { en: 'you', ko: '너', img: '👉' },
      ],
      questions: [
        { q: "What's your name?", ko: '이름이 뭐야?', answer: 'My name is {NAME}.', keywords: ['yuni', 'yun', 'kim yun', 'yoon', 'uni', 'you knee', 'eunie', 'yuny', 'june'] },
        { q: 'How old are you?', ko: '몇 살이야?', answer: "I'm {AGE}.", keywords: ['six', 'seven', 'eight', '6', '7', '8', 'heaven', 'ate'] },
      ],
    },
    {
      id: 'family', title: '가족과 친구', en: 'Family & Friends', icon: '🏡', sticker: '💞',
      words: [
        { en: 'mom', ko: '엄마', img: '👩' },
        { en: 'dad', ko: '아빠', img: '👨' },
        { en: 'brother', ko: '남자 형제', img: '👦' },
        { en: 'sister', ko: '여자 형제', img: '👧' },
        { en: 'baby', ko: '아기', img: '👶' },
        { en: 'cousin', ko: '사촌', img: '🧒' },
        { en: 'grandma', ko: '할머니', img: '👵' },
        { en: 'grandpa', ko: '할아버지', img: '👴' },
        { en: 'family', ko: '가족', img: '🏡' },
        { en: 'love', ko: '사랑', img: '❤️' },
      ],
      questions: [
        { q: "Who's Hyun?", ko: '현이는 누구야?', answer: 'Hyun is my {HYUN_REL}.', keywords: ['brother', 'sister', 'brothers', 'sisters'], friend: 'hyun' },
        { q: "Who's Eunhoo?", ko: '은후는 누구야?', answer: 'Eunhoo is my friend.', keywords: ['friend', 'friends', 'fred'], friend: 'eunhoo' },
        { q: "Who's Chorok?", ko: '초록이는 누구야?', answer: 'Chorok is my cousin.', keywords: ['cousin', 'cousins', 'causing'], friend: 'chorok' },
      ],
    },
    {
      id: 'colors', title: '색깔과 숫자', en: 'Colors & Numbers', icon: '🎨', sticker: '🌈',
      words: [
        { en: 'red', ko: '빨간색', img: '🔴' },
        { en: 'blue', ko: '파란색', img: '🔵' },
        { en: 'yellow', ko: '노란색', img: '🟡' },
        { en: 'green', ko: '초록색', img: '🟢' },
        { en: 'one', ko: '하나', img: '1️⃣', alt: ['won', '1'] },
        { en: 'two', ko: '둘', img: '2️⃣', alt: ['to', 'too', '2'] },
        { en: 'three', ko: '셋', img: '3️⃣', alt: ['tree', 'free', '3'] },
        { en: 'four', ko: '넷', img: '4️⃣', alt: ['for', '4'] },
        { en: 'five', ko: '다섯', img: '5️⃣', alt: ['5'] },
        { en: 'ten', ko: '열', img: '🔟', alt: ['10', 'tan'] },
      ],
      questions: [
        { q: 'What color is it?', ko: '이건 무슨 색이야?', img: '🔴', answer: "It's red.", keywords: ['red', 'read', 'rat'] },
        { q: 'How many ladybugs are there?', ko: '무당벌레가 몇 마리야?', img: '🐞🐞🐞', answer: 'Three.', keywords: ['three', '3', 'tree', 'free'] },
      ],
    },
    {
      id: 'insects', title: '곤충', en: 'Insects', icon: '🐞', sticker: '🦋', fav: true,
      words: [
        { en: 'ant', ko: '개미', img: '🐜', alt: ['aunt', 'and'] },
        { en: 'bee', ko: '벌', img: '🐝', alt: ['b', 'be'] },
        { en: 'butterfly', ko: '나비', img: '🦋' },
        { en: 'beetle', ko: '딱정벌레', img: '🪲', alt: ['beetles', 'beatle', 'beetle'] },
        { en: 'ladybug', ko: '무당벌레', img: '🐞', alt: ['lady bug'] },
        { en: 'cricket', ko: '귀뚜라미', img: '🦗' },
        { en: 'caterpillar', ko: '애벌레', img: '🐛' },
        { en: 'mosquito', ko: '모기', img: '🦟' },
        { en: 'spider', ko: '거미', img: '🕷️' },
        { en: 'bug', ko: '벌레', img: '🪱', alt: ['bag', 'book'] },
      ],
      questions: [
        { q: "What's this?", ko: '이건 뭐야?', img: '🪲', answer: "It's a beetle.", keywords: ['beetle', 'beetles', 'beatle'] },
        { q: 'Do you like bugs?', ko: '벌레 좋아해?', answer: 'Yes, I do.', keywords: ['yes', 'no', 'yeah', 'i do'] },
      ],
    },
    {
      id: 'sea', title: '물고기·바다생물', en: 'Sea Animals', icon: '🐟', sticker: '🐳', fav: true,
      words: [
        { en: 'fish', ko: '물고기', img: '🐟' },
        { en: 'shark', ko: '상어', img: '🦈' },
        { en: 'whale', ko: '고래', img: '🐳', alt: ['well', 'wail'] },
        { en: 'octopus', ko: '문어', img: '🐙' },
        { en: 'crab', ko: '게', img: '🦀' },
        { en: 'turtle', ko: '거북', img: '🐢' },
        { en: 'dolphin', ko: '돌고래', img: '🐬' },
        { en: 'shrimp', ko: '새우', img: '🦐' },
        { en: 'squid', ko: '오징어', img: '🦑' },
        { en: 'sea', ko: '바다', img: '🌊', alt: ['see', 'c'] },
      ],
      questions: [
        { q: 'Can fish swim?', ko: '물고기는 헤엄칠 수 있어?', img: '🐟', answer: 'Yes, they can.', keywords: ['yes', 'yeah', 'they can', 'can'] },
        { q: "What's this?", ko: '이건 뭐야?', img: '🐙', answer: "It's an octopus.", keywords: ['octopus', 'octopuses'] },
      ],
    },
    {
      id: 'body', title: '몸과 기분', en: 'Body & Feelings', icon: '🙂', sticker: '💪',
      words: [
        { en: 'eye', ko: '눈', img: '👁️', alt: ['i', 'eyes', 'hi'] },
        { en: 'ear', ko: '귀', img: '👂', alt: ['here', 'year', 'ears'] },
        { en: 'nose', ko: '코', img: '👃', alt: ['knows', 'no'] },
        { en: 'mouth', ko: '입', img: '👄' },
        { en: 'hand', ko: '손', img: '✋', alt: ['hands'] },
        { en: 'foot', ko: '발', img: '🦶', alt: ['feet', 'food'] },
        { en: 'happy', ko: '행복한', img: '😊' },
        { en: 'sad', ko: '슬픈', img: '😢', alt: ['said'] },
        { en: 'angry', ko: '화난', img: '😠' },
        { en: 'sleepy', ko: '졸린', img: '😴' },
      ],
      questions: [
        { q: 'How are you?', ko: '기분 어때?', answer: "I'm happy.", keywords: ['happy', 'good', 'fine', 'great', 'sleepy', 'hungry', 'sad', 'okay', 'ok', 'tired', 'angry'] },
        { q: "What's this?", ko: '이건 뭐야?', img: '👃', answer: "It's my nose.", keywords: ['nose', 'knows', 'noes'] },
      ],
    },
    {
      id: 'living', title: '여러 가지 생물', en: 'Living Things', icon: '🌱', sticker: '🐸', fav: true,
      words: [
        { en: 'frog', ko: '개구리', img: '🐸' },
        { en: 'snake', ko: '뱀', img: '🐍' },
        { en: 'bird', ko: '새', img: '🐦' },
        { en: 'rabbit', ko: '토끼', img: '🐰' },
        { en: 'dog', ko: '개', img: '🐶' },
        { en: 'cat', ko: '고양이', img: '🐱' },
        { en: 'lion', ko: '사자', img: '🦁' },
        { en: 'tree', ko: '나무', img: '🌳' },
        { en: 'flower', ko: '꽃', img: '🌸' },
        { en: 'snail', ko: '달팽이', img: '🐌' },
      ],
      questions: [
        { q: 'Is it big or small?', ko: '이건 커, 작아?', img: '🐌', answer: "It's small.", keywords: ['small', 'smal', 'mall'] },
        { q: "What's this?", ko: '이건 뭐야?', img: '🐸', answer: "It's a frog.", keywords: ['frog', 'frogs', 'frock'] },
      ],
    },
    {
      id: 'food', title: '음식', en: 'Food', icon: '🍎', sticker: '🍕',
      words: [
        { en: 'apple', ko: '사과', img: '🍎' },
        { en: 'banana', ko: '바나나', img: '🍌' },
        { en: 'grape', ko: '포도', img: '🍇', alt: ['grapes'] },
        { en: 'strawberry', ko: '딸기', img: '🍓' },
        { en: 'pizza', ko: '피자', img: '🍕' },
        { en: 'milk', ko: '우유', img: '🥛' },
        { en: 'egg', ko: '달걀', img: '🥚' },
        { en: 'bread', ko: '빵', img: '🍞' },
        { en: 'rice', ko: '밥', img: '🍚', alt: ['nice', 'lice'] },
        { en: 'water', ko: '물', img: '💧' },
      ],
      questions: [
        { q: 'Do you like pizza?', ko: '피자 좋아해?', img: '🍕', answer: 'Yes, I do.', keywords: ['yes', 'no', 'yeah', 'i do'] },
        { q: 'What would you like?', ko: '뭐 먹고 싶어?', img: '🍓', answer: 'Strawberries, please.', keywords: ['strawberry', 'strawberries'] },
      ],
    },
    {
      id: 'robots', title: '로봇', en: 'Robots', icon: '🤖', sticker: '🚀', fav: true,
      words: [
        { en: 'robot', ko: '로봇', img: '🤖' },
        { en: 'battery', ko: '배터리', img: '🔋' },
        { en: 'button', ko: '버튼', img: '🔘' },
        { en: 'gear', ko: '톱니바퀴', img: '⚙️' },
        { en: 'computer', ko: '컴퓨터', img: '💻' },
        { en: 'rocket', ko: '로켓', img: '🚀' },
        { en: 'arm', ko: '팔', img: '💪' },
        { en: 'leg', ko: '다리', img: '🦵' },
        { en: 'walk', ko: '걷다', img: '🚶', alt: ['work', 'woke'] },
        { en: 'stop', ko: '멈추다', img: '🛑' },
      ],
      questions: [
        { q: 'What can the robot do?', ko: '로봇은 뭘 할 수 있어?', img: '🤖', answer: 'It can walk.', keywords: ['walk', 'run', 'jump', 'dance', 'talk', 'fly', 'swim', 'work', 'sing'] },
        { q: 'Is it a robot?', ko: '이건 로봇이야?', img: '🤖', answer: 'Yes, it is.', keywords: ['yes', 'yeah', 'it is'] },
      ],
    },
    {
      id: 'travel', title: '여행', en: 'Travel', icon: '✈️', sticker: '🗺️', fav: true,
      words: [
        { en: 'car', ko: '자동차', img: '🚗' },
        { en: 'bus', ko: '버스', img: '🚌' },
        { en: 'train', ko: '기차', img: '🚆' },
        { en: 'airplane', ko: '비행기', img: '✈️', alt: ['plane', 'air plane'] },
        { en: 'ship', ko: '배', img: '🚢' },
        { en: 'bike', ko: '자전거', img: '🚲' },
        { en: 'beach', ko: '해변', img: '🏖️' },
        { en: 'mountain', ko: '산', img: '⛰️' },
        { en: 'map', ko: '지도', img: '🗺️' },
        { en: 'bag', ko: '가방', img: '🎒', alt: ['back', 'bug'] },
      ],
      questions: [
        { q: 'Where do you want to go?', ko: '어디 가고 싶어?', answer: 'I want to go to the beach.', keywords: ['beach', 'mountain', 'zoo', 'park', 'sea', 'jeju', 'aquarium', 'museum', 'school', 'home'] },
        { q: 'How do you get there?', ko: '뭐 타고 가?', img: '✈️', answer: 'By airplane.', keywords: ['airplane', 'plane', 'air plane'] },
      ],
    },
    {
      id: 'science', title: '과학실험', en: 'Science Lab', icon: '🔬', sticker: '🧪', fav: true,
      mission: '집에서 해봐요! 컵에 물을 담고 얼음을 넣어요. "Put the ice in the water. Is it cold?" 현이랑 같이 손으로 만져보고 영어로 말해봐요.',
      words: [
        { en: 'ice', ko: '얼음', img: '🧊', alt: ['eyes', 'nice'] },
        { en: 'hot', ko: '뜨거운', img: '🔥', alt: ['hat', 'hut'] },
        { en: 'cold', ko: '차가운', img: '❄️', alt: ['called', 'code'] },
        { en: 'magnet', ko: '자석', img: '🧲' },
        { en: 'mix', ko: '섞다', img: '🥣', alt: ['max', 'mics'] },
        { en: 'microscope', ko: '현미경', img: '🔬' },
        { en: 'test tube', ko: '시험관', img: '🧪', alt: ['tube', 'test'] },
        { en: 'rainbow', ko: '무지개', img: '🌈' },
        { en: 'sun', ko: '해', img: '☀️', alt: ['son', 'some'] },
        { en: 'balloon', ko: '풍선', img: '🎈' },
      ],
      questions: [
        { q: 'Is it hot or cold?', ko: '이건 뜨거워, 차가워?', img: '🧊', answer: "It's cold.", keywords: ['cold', 'called', 'code', 'cool'] },
        { q: "What's this?", ko: '이건 뭐야?', img: '🧲', answer: "It's a magnet.", keywords: ['magnet', 'magnets'] },
      ],
    },
    {
      id: 'actions', title: '할 수 있어요', en: 'Actions', icon: '🏃', sticker: '🏆',
      words: [
        { en: 'run', ko: '달리다', img: '🏃', alt: ['ran', 'fun'] },
        { en: 'jump', ko: '뛰다', img: '🦘' },
        { en: 'swim', ko: '수영하다', img: '🏊' },
        { en: 'fly', ko: '날다', img: '🕊️', alt: ['fry', 'flight'] },
        { en: 'dance', ko: '춤추다', img: '💃' },
        { en: 'sing', ko: '노래하다', img: '🎤', alt: ['sink', 'thing'] },
        { en: 'eat', ko: '먹다', img: '🍽️', alt: ['it'] },
        { en: 'read', ko: '읽다', img: '📖', alt: ['red'] },
        { en: 'draw', ko: '그리다', img: '🖍️' },
        { en: 'climb', ko: '오르다', img: '🧗' },
      ],
      questions: [
        { q: 'Can you swim?', ko: '수영할 수 있어?', img: '🏊', answer: 'Yes, I can.', keywords: ['yes', 'no', 'yeah', 'i can', 'can'] },
        { q: 'What do you like to do?', ko: '뭐 하는 거 좋아해?', answer: 'I like to draw.', keywords: ['run', 'jump', 'swim', 'dance', 'sing', 'read', 'draw', 'play', 'climb', 'eat', 'fly'] },
      ],
    },
  ],

  // 로봇 친구가 하는 영어 말 (원어민 녹음 파일이 audio 폴더에 있어요. 고치면 녹음 대신 기기 음성으로 나와요)
  lines: {
    hi: 'Hi, {NAME}!',
    greet: 'Hi, {NAME}! How are you today?',
    feelings: {
      happy: ["I'm happy!", "Yay! Me too! Let's get started!"],
      great: ["I'm great!", "Awesome! Let's get started!"],
      sleepy: ["I'm sleepy!", "Let's wake up with some English!"],
      hungry: ["I'm hungry!", "Me too! Let's learn first, then snack time!"],
      sad: ["I'm sad.", "Aww. Let's have some fun together!"],
    },
    greetOk: "Great! Let's get started!",
    praise: ['Great job!', 'Awesome!', 'You got it!', 'Nice work, {NAME}!', 'Perfect!', "Yes! That's right!", 'Well done!', 'Wow, super!'],
  },

  // 함께하는 친구들 (앱 속 캐릭터)
  friends: {
    eunhoo: { name: '은후', color: '#ffb74d', role: '같이 문제 푸는 친구' },
    chorok: { name: '초록', color: '#66bb6a', role: '윤이가 가르쳐주는 동생' },
    hyun: { name: '현', color: '#64b5f6', role: '윤이가 가르쳐주는 동생' },
  },
};
