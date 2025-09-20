export const content = {
    title: "Защо не злато?",
    subtitle: "Историята на златния стандарт и защо няма да се върне",
    readingTime: 10,
    lastUpdated: "2025-01-15",
    tableOfContents: [
        { id: "introduction", title: "Въведение" },
        { id: "gold-standard-history", title: "Ерата на златния стандарт" },
        { id: "bretton-woods", title: "Системата от Бретън Уудс" },
        { id: "nixon-shock", title: "Шокът на Никсън" },
        { id: "gold-problems", title: "Проблеми със златото" },
        { id: "gold-vs-bitcoin", title: "Злато срещу Биткойн" },
        { id: "why-not-return", title: "Защо златото няма да се върне" },
        { id: "conclusion", title: "Заключение" }
    ],
    sections: [
        {
            id: "introduction",
            title: "Въведение",
            content: `
                <p class="text-lg leading-relaxed mb-6">
                    Златото е служило като пари за над 5000 години и остава дълбоко вкоренено в човешката
                    психология като резерв на стойност. Много хора гледат на златото като защита срещу
                    обезценяването на фиатната валута и вярват, че връщане към златния стандарт би решило
                    нашите парични проблеми.
                </p>
                <p class="leading-relaxed mb-6">
                    Въпреки това, когато се измери срещу Биткойн, златото последователно показва по-слабо представяне, разкривайки
                    основни ограничения, които го правят неподходящо като пари за цифровата епоха.
                    Разбирането защо златото се провали като паричен стандарт помага да се обясни защо Биткойн
                    представлява по-добра алтернатива.
                </p>
            `
        },
        {
            id: "gold-standard-history",
            title: "Ерата на златния стандарт",
            content: `
                <p class="leading-relaxed mb-6">
                    Класическият златен стандарт функционираше приблизително от 1870 до 1914 г., представлявайки
                    най-близкото нещо до истински глобална парична система, до което е стигнало човечеството. През този период
                    основните икономики фиксираха валутите си към злато при специфични курсове.
                </p>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <h4 class="font-semibold text-yellow-800 mb-3">Предимства на златния стандарт</h4>
                    <ul class="space-y-2 text-yellow-700">
                        <li>• Ценова стабилност за дълги периоди</li>
                        <li>• Улесняване на международната търговия</li>
                        <li>• Автоматично регулиране на платежния баланс</li>
                        <li>• Ограничена правителствена парична манипулация</li>
                    </ul>
                </div>
                <p class="leading-relaxed mb-6">
                    Въпреки това, дори по време на разцвета си, златният стандарт страдаше от критични недостатъци,
                    които в крайна сметка щяха да доведат до неговото изоставяне. Системата беше твърда, дефлационна
                    по време на икономически спадове и уязвима на открития на злато, които можеха да причинят
                    внезапна инфлация.
                </p>
                <div class="bg-white border rounded-lg p-4 mb-6">
                    <h4 class="font-semibold text-gray-800 mb-2">Ключова хронология</h4>
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex justify-between">
                            <span>1870-1914</span>
                            <span>Ера на класическия златен стандарт</span>
                        </div>
                        <div class="flex justify-between">
                            <span>1914-1918</span>
                            <span>ПСВ: Златният стандарт е спрян</span>
                        </div>
                        <div class="flex justify-between">
                            <span>1925-1931</span>
                            <span>Опит за връщане към златния стандарт</span>
                        </div>
                        <div class="flex justify-between">
                            <span>1931</span>
                            <span>Великобритания изоставя златния стандарт</span>
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: "bretton-woods",
            title: "Системата от Бретън Уудс",
            content: `
                <p class="leading-relaxed mb-6">
                    След Втората световна война, системата от Бретън Уудс установи златно-обменен стандарт
                    с американския долар като основна резервна валута в света. Другите валути бяха закачени за
                    долара, докато доларът оставаше конвертируем в злато на $35 за унция.
                </p>
                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white border rounded-lg p-4">
                        <h4 class="font-semibold text-gray-800 mb-2">Дизайн на системата</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• USD подкрепен от злато на $35/унция</li>
                            <li>• Други валути закачени за USD</li>
                            <li>• Фиксирани обменни курсове</li>
                            <li>• САЩ обещаха конвертируемост в злато</li>
                        </ul>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 class="font-semibold text-red-800 mb-2">Фатален недостатък</h4>
                        <p class="text-sm text-red-700">
                            Системата зависеше изцяло от американската парична дисциплина.
                            Когато САЩ започнаха да печатат повече долари, отколкото имаха злато
                            да ги подкрепят, системата стана неустойчива.
                        </p>
                    </div>
                </div>
                <p class="leading-relaxed mb-6">
                    Системата от Бретън Уудс работеше разумно добре около 25 години, но съдържаше
                    семената на собственото си разрушение. С растежа на американската икономика и разширяването на глобалната търговия,
                    търсенето на долари като резерви нарасна по-бързо от американските златни резерви.
                </p>
            `
        },
        {
            id: "nixon-shock",
            title: "Шокът на Никсън",
            content: `
                <p class="leading-relaxed mb-6">
                    На 15 август 1971 г. президентът Никсън обяви, че Съединените щати вече няма да
                    конвертират долари в злато при фиксиран курс. Този "Шок на Никсън" ефективно сложи край на
                    последния остатък от международния златен стандарт и въведе ерата на чистите фиатни пари.
                </p>
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 mb-6">
                    <h4 class="font-semibold text-gray-800 mb-2">Защо Никсън затвори златния прозорец</h4>
                    <ul class="text-gray-700 space-y-1 text-sm">
                        <li>• Разходите за войната във Виетнам създадоха бюджетни дефицити</li>
                        <li>• Програмите на Великото общество увеличиха вътрешните разходи</li>
                        <li>• Чуждестранните централни банки започнаха да искат злато за долари</li>
                        <li>• Американските златни резерви намаляха от 20 000 на 8000 тона</li>
                    </ul>
                </div>
                <p class="leading-relaxed mb-6">
                    Шокът на Никсън разкри основния проблем с всеки златен стандарт в модерната епоха:
                    правителствата винаги ще изберат да нарушат златната връзка, вместо да наложат фискалната
                    дисциплина, която златото изисква. Този модел се е повтарял през цялата история.
                </p>
                <div class="bg-orange-100 border border-orange-300 rounded-lg p-6 mb-6">
                    <p class="text-orange-800 font-medium">
                        "Всички сме кейнсианци сега." - Ричард Никсън
                    </p>
                    <p class="text-orange-700 text-sm mt-2">
                        Тази цитата обобщава политическата реалност, която доведе до упадъка на златото като пари.
                        Кейнсианската икономика обеща на правителствата, че могат да решават икономически проблеми чрез
                        парична манипулация—нещо, което златото не би позволило.
                    </p>
                </div>
            `
        },
        {
            id: "gold-problems",
            title: "Проблеми със златото",
            content: `
                <p class="leading-relaxed mb-6">
                    Въпреки че златото има отлични свойства като резерв на стойност, то има значителни ограничения
                    като пари в модерния свят. Тези ограничения стават още по-очевидни, когато се сравнят
                    със свойствата на Биткойн.
                </p>
                <div class="space-y-4 mb-6">
                    <div class="bg-white border-l-4 border-red-400 p-4">
                        <h4 class="font-semibold text-red-800 mb-2">Риск от централизация</h4>
                        <p class="text-red-700 text-sm">
                            Златото изисква доверени кастодианци за съхранение и транспорт. Това създава
                            единични точки на отказ, които правителствата могат да контролират или конфискуват.
                        </p>
                    </div>
                    <div class="bg-white border-l-4 border-red-400 p-4">
                        <h4 class="font-semibold text-red-800 mb-2">Проблеми с преносимостта</h4>
                        <p class="text-red-700 text-sm">
                            Златото е тежко, скъпо за транспорт и трудно за проверка. Преместването на
                            големи количества изисква специализирана инфраструктура и сигурност.
                        </p>
                    </div>
                    <div class="bg-white border-l-4 border-red-400 p-4">
                        <h4 class="font-semibold text-red-800 mb-2">Проблеми с делимостта</h4>
                        <p class="text-red-700 text-sm">
                            Златото не може лесно да се разделя за малки транзакции. Това доведе до
                            създаването на хартиени IOU-та, които в крайна сметка станаха частичен резервен банкинг.
                        </p>
                    </div>
                    <div class="bg-white border-l-4 border-red-400 p-4">
                        <h4 class="font-semibold text-red-800 mb-2">Разходи за проверка</h4>
                        <p class="text-red-700 text-sm">
                            Определянето на чистотата и автентичността на златото изисква скъпо оборудване
                            и експертиза, което го прави непрактично за ежедневни транзакции.
                        </p>
                    </div>
                </div>
                <p class="leading-relaxed mb-6">
                    Тези практически ограничения означаваха, че дори по време на ерата на златния стандарт, повечето хора
                    не извършваха транзакции с физическо злато. Вместо това използваха хартиени сертификати, подкрепени от
                    злато—което неизбежно доведе до частичен резервен банкинг и евентуалното изоставяне
                    на златното подкрепяне.
                </p>
            `
        },
        {
            id: "gold-vs-bitcoin",
            title: "Злато срещу Биткойн",
            content: `
                <p class="leading-relaxed mb-6">
                    При сравняване на златото с Биткойн във всички парични свойства, Биткойн се откроява като
                    ясно по-добър за цифровата епоха. Ето директно сравнение:
                </p>
                <div class="overflow-x-auto mb-6">
                    <table class="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 p-3 text-left">Свойство</th>
                                <th class="border border-gray-300 p-3 text-center">Злато</th>
                                <th class="border border-gray-300 p-3 text-center">Биткойн</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="border border-gray-300 p-3 font-medium">Рядкост</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-yellow-600">⚠️</span>
                                    <div class="text-xs text-gray-600">Възможни нови открития</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">Абсолютно фиксирано на 21М</div>
                                </td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="border border-gray-300 p-3 font-medium">Преносимост</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-red-600">❌</span>
                                    <div class="text-xs text-gray-600">Тежко, скъпо за движение</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">Мигновен глобален трансфер</div>
                                </td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 p-3 font-medium">Делимост</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-yellow-600">⚠️</span>
                                    <div class="text-xs text-gray-600">Практически ограничения</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">8 десетични места</div>
                                </td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="border border-gray-300 p-3 font-medium">Проверимост</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-red-600">❌</span>
                                    <div class="text-xs text-gray-600">Изисква експертиза</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">Криптографски доказуемо</div>
                                </td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 p-3 font-medium">Устойчивост на цензура</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-red-600">❌</span>
                                    <div class="text-xs text-gray-600">Риск от конфискация</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">Самосуверенно</div>
                                </td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="border border-gray-300 p-3 font-medium">Мрежови ефекти</td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-yellow-600">⚠️</span>
                                    <div class="text-xs text-gray-600">Намаляваща парична употреба</div>
                                </td>
                                <td class="border border-gray-300 p-3 text-center">
                                    <span class="text-green-600">✅</span>
                                    <div class="text-xs text-gray-600">Растящо приемане</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p class="leading-relaxed mb-6">
                    Това сравнение разкрива защо Биткойн често се нарича "цифрово злато"—той взима най-добрите
                    свойства на златото и подобрява слабостите му чрез технология.
                </p>
            `
        },
        {
            id: "why-not-return",
            title: "Защо златото няма да се върне",
            content: `
                <p class="leading-relaxed mb-6">
                    Въпреки историческата роля на златото и продължаващата му привлекателност, няколко фактора правят връщането
                    към златния стандарт политически и практически невъзможно:
                </p>
                <div class="space-y-6 mb-6">
                    <div class="bg-white border rounded-lg p-6">
                        <h4 class="font-semibold text-gray-800 mb-3">Политическа невъзможност</h4>
                        <p class="text-gray-700 mb-3">
                            Модерните правителства зависят от паричната гъвкавост за финансиране на разходи, управление на
                            кризи и манипулиране на икономически цикли. Златният стандарт би елиминирал
                            тази способност, правейки го политически неприемлив.
                        </p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Няма повече дефицитни разходи без последствия</li>
                            <li>• Няма повече спасяване на фалиращи институции</li>
                            <li>• Няма повече парични стимули по време на рецесии</li>
                            <li>• Няма повече валутна манипулация за търговски предимства</li>
                        </ul>
                    </div>

                    <div class="bg-white border rounded-lg p-6">
                        <h4 class="font-semibold text-gray-800 mb-3">Практически предизвикателства</h4>
                        <p class="text-gray-700 mb-3">
                            Връщането към злато би изискало масивни логистични промени, които биха
                            нарушили цялата глобална финансова система:
                        </p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Масивна преоценка на цените на златото (потенциално $50,000+ за унция)</li>
                            <li>• Пълно преструктуриране на централното банкиране</li>
                            <li>• Международна координация на обменните курсове</li>
                            <li>• Изоставяне на частичния резервен банкинг</li>
                        </ul>
                    </div>

                    <div class="bg-white border rounded-lg p-6">
                        <h4 class="font-semibold text-gray-800 mb-3">Технологично остаряване</h4>
                        <p class="text-gray-700 mb-3">
                            Дори ако златният стандарт бъде възстановен, Биткойн предлага по-добра
                            алтернатива, която прави ограниченията на златото още по-очевидни:
                        </p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Биткойн решава проблемите с преносимостта на златото</li>
                            <li>• Биткойн елиминира нуждата от доверени кастодианци</li>
                            <li>• Биткойн предоставя по-добра проверка и делимост</li>
                            <li>• Биткойн предлага превъзходна устойчивост на цензура</li>
                        </ul>
                    </div>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h4 class="font-semibold text-blue-800 mb-3">Алтернативата Биткойн</h4>
                    <p class="text-blue-700">
                        Вместо да се опитват да възстановят остаряла парична система, индивидите
                        могат просто да приемат Биткойн като своя разчетна единица. Това предоставя всички
                        предимства на твърдите пари, без да изисква политическа промяна или международна
                        координация.
                    </p>
                </div>
            `
        },
        {
            id: "conclusion",
            title: "Заключение",
            content: `
                <p class="leading-relaxed mb-6">
                    Златото служеше добре на човечеството като пари хиляди години, но има основни
                    ограничения, които го правят неподходящо за цифровата епоха. Златният стандарт не беше
                    изоставен заради конспирация—той беше изоставен, защото физическите свойства на златото
                    го правеха непрактично за модерните икономически нужди.
                </p>
                <div class="bg-orange-100 border border-orange-300 rounded-lg p-6 mb-6">
                    <h4 class="font-semibold text-orange-800 mb-3">Ключови прозрения</h4>
                    <ul class="text-orange-700 space-y-2">
                        <li>• Ограниченията на златото доведоха до създаването на частичен резервен банкинг</li>
                        <li>• Правителствата винаги ще изберат паричната гъвкавост пред ограниченията на златото</li>
                        <li>• Биткойн решава проблемите на златото, запазвайки паричните му свойства</li>
                        <li>• Връщането към злато не е нито политически възможно, нито технически необходимо</li>
                    </ul>
                </div>
                <p class="leading-relaxed mb-6">
                    Когато измервате активи в Биткойн, а не в злато или фиатни валути,
                    получавате по-ясна картина на тяхното истинско представяне. Тази инвестиционна игра
                    демонстрира как дори златото—традиционният резерв на стойност—губи покупателна
                    сила, когато се измерва срещу Биткойн във времето.
                </p>
                <p class="leading-relaxed">
                    Биткойн представлява логическата еволюция на парите—взимайки най-добрите свойства
                    на златото и подобрявайки ги чрез криптография и децентрализация. Той не е
                    просто цифрово злато; той е по-добър от златото.
                </p>
            `
        }
    ],
    relatedTopics: [
        {
            title: "Защо Биткойн?",
            description: "Разбиране на Биткойн като неутрални, аполитични пари",
            link: "#education/why-bitcoin"
        },
        {
            title: "Фиатният експеримент",
            description: "Как стигнахме до днешната парична система",
            link: "#education/fiat-experiment"
        }
    ]
};

export default content;