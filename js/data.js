/* =========================================================
 * data.js · 常量、数据状态、存储与数据迁移
 * 注意：库名 / store / key / 字段名都与旧版完全一致，不可改动。
 * ========================================================= */

/* ---------- 卡片类型 / 关系 / 心情等常量 ---------- */
const TYPES={
event:{n:'经历',icon:'📅',c:'#ffb6e6',desc:'发生过的一件事',ex:'演唱会、毕业、搬家'},
person:{n:'人物',icon:'👤',c:'#a8c8ff',desc:'生命里重要的人',ex:'家人、朋友、偶像、宠物'},
fav:{n:'喜爱',icon:'💖',c:'#ff9fb2',desc:'喜欢的人和事物',ex:'明星、歌、剧、美食'},
item:{n:'物件',icon:'💎',c:'#e0c3fc',desc:'有故事的东西',ex:'礼物、信、旧手机'},
travel:{n:'旅行',icon:'✈️',c:'#9be7ff',desc:'去过的地方',ex:'会自动统计足迹'},
note:{n:'随想',icon:'📝',c:'#b5f5c8',desc:'什么都不用填',ex:'一段话、一句感悟'}
};
const TYPE_ORDER=['event','person','fav','item','travel','note'];
const TYPE_HALL={event:'childhood',person:'friends',fav:'fav',item:'treasure',travel:'travel',note:'dream'};
const HALL_TYPE={travel:'travel',fav:'fav',treasure:'item'};
const RELS=[{id:'family',n:'家人',c:'#ffcfa8'},{id:'friend',n:'朋友',c:'#8fe3c8'},{id:'love',n:'恋人',c:'#ff8fc7'},{id:'classmate',n:'同学',c:'#9fd8ff'},{id:'colleague',n:'同事',c:'#ffe29a'},{id:'idol',n:'偶像',c:'#c3b1ff'},{id:'pet',n:'宠物',c:'#b5f5c8'},{id:'other',n:'其他',c:'#d9d2f0'}];
const FAV_CATS=['明星 / 偶像','音乐','影视剧','书','动漫','游戏','美食','地方','爱好','其他'];
const MOODS=[{id:'happy',e:'✨',n:'快乐'},{id:'moved',e:'🥹',n:'感动'},{id:'grow',e:'🌱',n:'成长'},{id:'love',e:'💗',n:'心动'},{id:'proud',e:'🏆',n:'骄傲'},{id:'calm',e:'🍃',n:'平静'},{id:'funny',e:'😂',n:'好笑'},{id:'sad',e:'🌧️',n:'难过'},{id:'regret',e:'🍂',n:'遗憾'}];
const MOTTOS=['慢慢来，比较快','生活明朗，万物可爱','温柔且坚定','去见想见的人，去看想看的风景','我是我自己的光'];
const HALL_COLORS=[['#c3b1ff','#6e8bff'],['#ffd6a5','#ff9fb2'],['#a0e7e5','#7aa2ff'],['#b5f5c8','#5fc9c2'],['#ffe29a','#ff9f6e'],['#ffb6e6','#ff6f9c'],['#9be7ff','#7b8cff'],['#e0c3fc','#8ec5fc'],['#fbc2eb','#a18cd1'],['#8d7bc0','#3d2f6e']];

/* ---------- 默认展厅 ---------- */
const DEFAULT_HALLS=[
{id:'origin',name:'序章 · 降临',icon:'🌙',g:['#c3b1ff','#6e8bff'],desc:'我来到这个世界的那一天'},
{id:'childhood',name:'童年馆',icon:'🧸',g:['#ffd6a5','#ff9fb2'],desc:'糖果色的旧时光'},
{id:'youth',name:'少年馆',icon:'🎒',g:['#a0e7e5','#7aa2ff'],desc:'课桌、操场与白衬衫'},
{id:'campus',name:'青春馆',icon:'🎓',g:['#b5f5c8','#5fc9c2'],desc:'第一次独自奔向远方'},
{id:'career',name:'追光馆',icon:'💼',g:['#ffe29a','#ff9f6e'],desc:'工作与成长的足迹'},
{id:'love',name:'心动馆',icon:'💗',g:['#ffb6e6','#ff6f9c'],desc:'那些怦然心动的瞬间'},
{id:'family',name:'家人馆',icon:'🏡',g:['#ffcfa8','#e8a0bf'],desc:'永远的港湾'},
{id:'friends',name:'友情馆',icon:'🤝',g:['#b8f2e6','#8fb3ff'],desc:'一路同行的人'},
{id:'fav',name:'心头好',icon:'🌟',g:['#ffd1a8','#ff8fc7'],desc:'我喜欢的人和事物'},
{id:'travel',name:'旅行馆',icon:'✈️',g:['#9be7ff','#7b8cff'],desc:'世界那么大，我去看过了'},
{id:'treasure',name:'珍藏馆',icon:'💎',g:['#e0c3fc','#8ec5fc'],desc:'物件、声音与气味里的回忆'},
{id:'dream',name:'星愿馆',icon:'🌠',g:['#fbc2eb','#a18cd1'],desc:'实现了的、还在路上的梦'},
{id:'secret',name:'秘密花园',icon:'🔐',g:['#8d7bc0','#3d2f6e'],desc:'只属于我的独家记忆',secret:true}
];

/* ---------- 灵感问题库（已合并 3.0 的扩充题目；"类型|问题"，不写类型就用展厅默认类型） ---------- */
const PROMPTS={
origin:['你出生在哪座城市？那天是什么季节、什么天气？','你的名字是谁取的？有什么含义？','你有小名吗？它是怎么来的？','你出生时，爸爸妈妈多大？家里是什么样子？','家人讲过关于你婴儿时期的什么"传说"？','你的第一张照片是什么样子？','note|你出生那一年，世界上发生了什么事？','你学会说的第一个词是什么？','你是在哪家医院出生的？还是在家里？','出生时有多重？家人讲过那天的什么细节？','你出生那天，是谁第一个抱了你？','你是家里第几个孩子？有兄弟姐妹吗？','你的生肖和星座是什么？你觉得准吗？','小时候的你，长得像爸爸还是像妈妈？','item|有没有保存下来的出生证、长命锁、胎毛笔或小手印？','满月或周岁办过酒吗？抓周抓到了什么？','你第一次走路是多大？在哪里？','你小时候主要是谁带大的？','婴儿时期的你，是爱哭还是爱笑？','你人生的第一个家在哪里？','person|你出生时，家里还有哪些长辈？','你的名字有没有差点叫成别的？','小时候身体好吗？有没有一次让家人特别担心？','家里有没有你小时候的录像或录音？','note|如果能回到你出生那天，你想对爸妈说什么？'],
childhood:['你人生中最早的一段记忆是什么？','item|小时候最喜欢的玩具是什么？它现在在哪里？','童年住过的房子长什么样？你的房间呢？','fav|小时候最爱吃的零食，或者一道家常菜？','fav|最爱看的动画片、绘本或电视剧？','第一天上幼儿园或小学，你哭了吗？','有没有一次闯祸被骂的经历？','person|童年最好的玩伴是谁？现在还联系吗？','寒暑假通常怎么过？','note|小时候的梦想是长大成为什么？','过年过节时，最开心的一个画面？','一次生病或受伤的经历，谁在照顾你？','幼儿园叫什么名字？老师长什么样？','小学在哪里？每天怎么去上学？','person|小学的班主任是谁？','fav|小时候最爱玩的游戏？跳皮筋、弹珠、丢沙包……','item|你收集过什么？贴纸、卡片、干脆面里的小卡？','第一次自己一个人去买东西？','养过小动物吗？蚕、金鱼、小鸡？','第一张奖状是因为什么得的？','小时候最怕的东西是什么？','有没有走丢或迷路过一次？','上过什么兴趣班？喜欢吗？','六一儿童节表演过节目吗？','第一次看电影是在哪里？看的什么？','你小时候的外号是什么？','小时候被表扬最开心的一次？','夏天的夜晚，你通常在做什么？','note|小时候你相信过什么「传说」？比如吞西瓜籽会长西瓜'],
youth:['你的初中、高中叫什么？校服长什么样？','person|印象最深的一位老师，他/她做了什么？','person|你的同桌是谁？你们之间有什么故事？','第一次考砸，或者考得特别好的时候？','person|那时候偷偷喜欢过谁吗？','fav|最着迷的明星、歌曲、游戏或小说？','和父母最大的一次争吵是因为什么？','中考或高考那几天，你记得什么？','学生时代最"叛逆"的一件事？','毕业那天，你在想什么？','你住校吗？宿舍是什么样子？','每天上学的路上会经过什么？','最喜欢和最讨厌的科目分别是什么？','课间和午休，你们一般干什么？','学校门口有什么小摊或小卖部？','运动会上你参加过什么项目？','有没有被请过家长？是因为什么？','那时候班里流行过什么？','item|写过日记、同学录，或者传过纸条吗？','第一次拥有手机、QQ 或社交账号是什么时候？','第一次一个人出远门？','青春期最大的烦恼是什么？','晚自习的教室，你还记得什么？','person|那时候最好的朋友是谁？','参加过竞赛、考级或者艺考吗？','有没有一位同学改变过你的想法？','note|那时候你以为长大后的自己会是什么样？'],
campus:['第一次离开家去远方，是什么心情？','你的大学，或者人生第一座独立生活的城市是哪里？','person|室友们都是什么样的人？','第一次自己赚到钱，是怎么花的？','参加过什么社团、比赛或者活动？','熬过最晚的一次夜，是在做什么？','note|那几年里最迷茫的时刻？','毕业照上，你站在哪个位置？','青春里你做过的最勇敢的一件事？','收到录取通知书的那一天？','第一次去报到，是谁送你去的？','专业是怎么选的？后悔过吗？','军训时，你记得什么？','食堂里最爱吃的一道菜？','person|这几年里，对你影响最大的一个人？','挂过科，或者拿过奖学金吗？','做过的兼职或实习？','图书馆或自习室里，你最常坐的位置？','一次难忘的宿舍夜谈？','和同学一起出去玩的一次旅行？','考研、出国还是工作，毕业前你是怎么选的？','写毕业论文、答辩的那段日子？','离开学校那天，最后看了一眼什么？','item|那几年留下来的一件东西：校园卡、学生证、毕业证？','第一次在外地过年或过生日？','note|如果能回去，你最想重新做的一件事？'],
career:['第一份工作是什么？怎么找到的？','第一次领工资的那天，你做了什么？','person|有没有遇到过贵人或者导师？','工作中最有成就感的一刻？','最想放弃的一次经历？后来怎么走出来的？','一次重要的跳槽、转行或者创业？','你做过最大胆的职业决定？','note|现在的你，在为什么而努力？','第一次面试是什么情景？','入职第一天，你穿了什么？','你的第一个工位是什么样的？','person|你的第一个领导是什么样的人？','person|工作中最合拍的同事？','加班到最晚的一次？','工作里犯过最大的一次错？','第一次升职或加薪？','第一次出差去了哪里？','第一次一个人租房，房子是什么样的？','辞职、被裁或者空窗期的那段日子？','一个被认可、被表扬的瞬间？','一次让你成长的失败？','用工资买下的第一件「大件」？','工作之外，你在坚持什么？','你的通勤路上会看到什么？','note|你理想中的工作是什么样的？','note|工作教会你最重要的一件事？'],
love:['person|第一次心动是什么时候？对方是什么样的人？','item|收到或送出的第一封情书、第一份礼物？','你们是怎么认识的？','第一次约会去了哪里？','一段让你成长的感情？','最浪漫的一个瞬间？','note|有没有一句话，让你一直记得？','note|你理想中的爱情是什么样子？','你们之间有什么只有彼此懂的小暗号？','一起度过的第一个节日是怎么过的？','item|对方送过你最用心的一件小东西？','一次吵架后又和好的经历？','你们一起去过、最想再去一次的地方？','note|你从这段感情里学会了什么？','person|一个让你心动过、却没能在一起的人？'],
family:['person|爸爸妈妈年轻时是什么样的人？','爷爷奶奶或外公外婆家是什么样子？','你们家有什么独特的传统或习惯？','和家人在一起最温暖的一个画面？','note|家人对你说过的最重要的一句话？','你第一次意识到父母老了，是什么时候？','person|和兄弟姐妹之间的有趣故事？','person|家里养过的宠物？','一顿让你永远记得的年夜饭？','小时候家里的饭桌上，通常有哪些菜？','item|家里有没有一件传了很多年的老物件？','一次全家人一起出门的经历？','person|家族里最有意思的一位亲戚？','note|你身上哪一点最像爸爸或妈妈？','你第一次为家人做的一件事？','note|如果能回到过去的某一天陪家人，你选哪天？'],
friends:['person|认识最久的朋友是谁？你们怎么认识的？','和朋友一起做过最疯狂的事？','person|低谷的时候，是谁陪在你身边？','一段走散了的友情？','note|你们之间的暗号、梗或者绰号？','一次难忘的聚会？','note|在朋友眼中，你是一个什么样的人？','你们最常去的地方是哪里？','一次朋友帮了你大忙的经历？','你为朋友做过最用心的一件事？','person|一个后来才变成好朋友的人？','一次和朋友聊到天亮的长谈？','person|网上认识、却很懂你的朋友？','note|你想对某位老朋友说的一句话？'],
fav:['你最喜欢的明星或偶像是谁？为什么喜欢 ta？','单曲循环最多的一首歌？','看了不止一遍的电影或电视剧？','一本让你念念不忘的书或漫画？','最爱的一道菜，或者一家常去的小店？','玩得最久的一款游戏？','event|现场看过的一场演唱会、演出或比赛？','一个让你一直喜欢的城市或角落？','一个坚持了很久的爱好？','一部把你看哭的电影或剧？','一个你一直在关注的博主或创作者？','你收藏最多的一类东西是什么？','一种你特别喜欢的天气或季节？','一个能让你放松下来的地方？','event|为了喜欢的人或事，做过最疯狂的一件事？','一位你很欣赏的作家或历史人物？'],
travel:['你人生的第一次旅行去了哪里？','第一次坐飞机或长途火车，是去哪里？','第一次出国或出境的经历？','一次说走就走的旅行？','旅途中遇到过最有趣的陌生人？','一处让你感到震撼的风景？','一次"翻车"的旅行经历？','吃过最难忘的一道异乡美食？','一个你还想再去一次的地方？','一次独自旅行的经历？','旅途中住过最难忘的一家民宿或酒店？','一张旅行照片背后的故事？','一次和家人一起的旅行？','旅途中迷过路吗？后来怎么样了？','item|旅行带回来最喜欢的纪念品？','note|一个很想去、但还没去成的地方？'],
treasure:['一件你保存了很多年的物品，它有什么故事？','你的第一部手机是什么？','收到过最珍贵的一份礼物？','fav|有没有一首歌，一听就会把你带回某个时刻？','note|一种会让你想起某个人的气味？','fav|一本改变过你的书，或者一部电影？','你珍藏的一张照片背后的故事？','一封你舍不得扔掉的信或卡片？','一张你珍藏的票根背后的故事？','一件舍不得扔掉的旧衣服？','一个你用了很多年的杯子或文具？','note|一段你保存下来的聊天记录或语音？','你小时候得过的奖状或证书？','一件你亲手做的东西？'],
dream:['你实现过的一个梦想？','note|一个还没实现，但一直放在心里的愿望？','note|人生清单上，你最想做的三件事？','note|十年后，你希望自己在哪里、过着怎样的生活？','note|想对十年后的自己说什么？','note|你最想学会的一项技能？','note|你希望别人怎样记住你？','小时候许过的一个生日愿望？','一个你为之努力了很久的目标？','note|一个你后来放下了的梦想？','note|如果没有任何限制，你最想做什么？','一次离梦想很近的时刻？','note|你最想带家人去做的一件事？'],
secret:['note|一件从未告诉过任何人的事？','一个让你后悔的决定？','一次偷偷哭过的夜晚？','note|一句你想说却没说出口的"对不起"或"谢谢"？','person|一个你暗恋过的人？','note|你内心最深的恐惧是什么？','note|一个只属于你自己的小小骄傲？','note|一个一直藏在心里的问题？','一次假装没事、其实很难过的时候？','note|一件你偷偷努力过的事？','note|你曾经羡慕过谁？为什么？','note|一个从没对人说过的愿望？'],
rooted:['你在哪座城市安了家？为什么是这里？','第一次买房，或者搬进一个稳定的家？','结婚的那一天？','person|孩子出生的那一刻？','第一次当爸爸或妈妈时的手忙脚乱？','事业上一个重要的转折？','为了家人做过的一个重要决定？','你和父母的关系，有了什么变化？','这几年学会的一项新技能？','一次体检或生病，让你开始重视健康？','家里的一次装修或搬家？','一次全家出游？','开始坚持的一项运动或习惯？','person|这些年一直留在身边的老朋友？','你有过「中年危机」吗？','一个让你骄傲的成就？','孩子第一天上学时，你在想什么？','note|这个阶段，你最想对自己说什么？','note|你觉得自己「扎根」了吗？'],
settle:['孩子长大离家的那一天？','送别一位长辈的经历？','事业上的高峰，或者一次转身？','重新捡起的一个爱好？','和老同学重聚的一次聚会？','身体的一次变化，让你重新认识自己？','一句你终于说出口的话？','重新认识父母的一个瞬间？','一趟期待了很久的旅行？','你学会放下的一件事？','家里迎来的一位新成员？','一位后辈向你请教的时候？','你和伴侣之间的新默契？','note|走到这里，你最感激的是什么？','note|你最想传给下一代的一样东西？'],
serene:['退休的那一天？','退休后的第一个早晨，你做了什么？','person|第一次抱孙辈的时候？','你现在每天的日常是什么样的？','新学会的一件事：智能手机、书法、跳舞……','一群老朋友聚在一起的时光？','回到故乡的一次经历？','一次说走就走的旅行？','和伴侣一起度过的一个纪念日？','你开始整理回忆的契机是什么？','note|你最想留给家人的一句话？','note|回头看，最值得的一个选择是什么？','note|如果年轻人向你讨教，你会说什么？'],
galaxy:['你最常想起的一段往事？','person|一位已经离开、但你常常想起的人？','你这一生最自豪的一件事？','全家人一起过的一个节日？','fav|你还会哼起的一首老歌？','你见证过的一次时代变化？','note|你想怎样被记住？','note|写给孙辈的一封信','note|这一生，你最想感谢谁？','note|如果有来生，你还想做什么？']
};

/* ---------- 编辑器文案 ---------- */
const STORY_HINTS={
event:[['📍','那天的场景是：'],['👥','当时身边有：'],['💭','我当时在想：'],['👂','我记得的声音、气味或味道：'],['💬','有人说了一句话：'],['🔮','现在回头看，我觉得：'],['💌','想对那时的自己说：']],
person:[['🌱','我们第一次见面是：'],['👀','ta 的样子：'],['💬','ta 常说的一句话：'],['🎞️','我们之间最难忘的一件事：'],['🔮','ta 对我的影响：'],['💌','想对 ta 说：']],
fav:[['✨','第一次被吸引是因为：'],['💗','最喜欢的地方：'],['🎵','印象最深的一个瞬间：'],['🌈','它陪我度过了：'],['🔮','它对我意味着：']],
item:[['🎁','它的来历：'],['🔍','它现在的样子：'],['💭','每次看到它，我会想起：'],['📦','它现在放在：']],
travel:[['🌅','到达时第一眼看到的：'],['🍜','吃到的好东西：'],['🙂','遇到的人：'],['😂','一件好笑或翻车的事：'],['🔮','这趟旅行让我明白：']],
note:[['💭','此刻我在想：'],['🌙','最近常常想起：'],['💌','想对自己说：']]
};
const TITLE_LB={event:['🏷️ 这件事叫什么 *','例如：第一次看周杰伦演唱会'],person:['👤 ta 的名字或称呼 *','例如：妈妈 / 同桌小林 / 周杰伦'],fav:['💖 你喜欢的是什么 *','例如：周杰伦 / 《海贼王》/ 楼下的牛肉面'],item:['💎 物件名称 *','例如：外婆织的围巾'],travel:['✈️ 给这次旅行起个名字 *','例如：京都的秋天'],note:['📝 用一句话概括 *','例如：某个失眠的夜晚']};
const STORY_LB={event:'📖 写下这段故事',person:'📖 关于 ta 的故事',fav:'📖 为什么喜欢',item:'📖 它背后的故事',travel:'📖 旅途中的故事',note:'📖 想写什么都可以'};
const FOLLOW={
event:[['person','👤','这件事里，有你想记录的人吗？'],['item','💎','有没有和它有关的物件？比如票根、照片、礼物'],['fav','💖','它和你喜欢的什么有关吗？比如一位歌手、一部剧']],
person:[['event','📅','写一件你和 ta 之间的事'],['note','💬','你想对 ta 说的一句话'],['item','💎','一件和 ta 有关的东西']],
fav:[['event','📅','一次和它有关的经历，比如一场演唱会'],['person','👤','和谁一起喜欢它？'],['note','📝','它陪你度过了什么样的时光？']],
item:[['person','👤','它和谁有关？'],['event','📅','它背后发生过的一件事']],
travel:[['person','👤','这趟旅行和谁一起？'],['item','💎','带回来的纪念品或照片'],['event','📅','旅途中最难忘的一件事']],
note:[['event','📅','这段想法来自哪件事？'],['person','👤','它让你想起了谁？']]
};

/* ---------- 新建展厅可选图标 ---------- */
const HALL_ICONS=['🐾','🎤','🎨','📚','⚽','🎮','🍜','🎵','🌊','🌷','🏠','🎬','🐱','☕','💫','🌻'];

/* ---------- 人生阶段规则（2.2） ---------- */
const V22_STAGE_RULES=[
 {id:'origin',ageFrom:0,ageTo:0},
 {id:'childhood',ageFrom:0,ageTo:12},
 {id:'youth',ageFrom:12,ageTo:18},
 {id:'campus',ageFrom:18,ageTo:25},
 {id:'career',ageFrom:25,ageTo:35},
 {id:'rooted',ageFrom:35,ageTo:45,name:'扎根馆',icon:'🌳',desc:'在世界里扎下根',g:['#c3b1ff','#b38acb']},
 {id:'settle',ageFrom:45,ageTo:60,name:'沉淀馆',icon:'🍂',desc:'岁月沉下来的样子',g:['#e0c3fc','#c99ac9']},
 {id:'serene',ageFrom:60,ageTo:75,name:'从容馆',icon:'🌅',desc:'慢下来的日子',g:['#fbc2eb','#b8a4e3']},
 {id:'galaxy',ageFrom:75,ageTo:200,name:'星河馆',icon:'🌌',desc:'一生的星光',g:['#b69cff','#9379c9']}
];

/* ---------- 外观预设 / 头像 ---------- */
const MUSEUM_PRESETS={
 dream:{name:'紫粉梦幻',background:'radial-gradient(ellipse at 15% 0%,#4b2a8a 0%,transparent 55%),radial-gradient(ellipse at 90% 100%,#7a2a6e 0%,transparent 55%),linear-gradient(160deg,#0b0a24,#1d1050 60%,#3a1c6e)',accent:'#ffb6e6',accent2:'#a8c8ff',glass:'rgba(255,255,255,.08)',glassB:'rgba(255,255,255,.18)',text:'#f3eeff',sub:'#c4b9ea',gold:'#ffe29a',surface:'rgba(42,26,88,.92)',nav:'rgba(15,10,40,.55)',buttonA:'#ff9ad5',buttonB:'#b69cff',buttonC:'#8ec5ff',buttonHoverA:'#ffaadd',buttonHoverB:'#c2abff',buttonHoverC:'#9fd0ff',buttonText:'#2a1450',palette:['255,182,230','168,200,255','255,226,154','255,255,255','200,170,255']},
 dawn:{name:'晨曦粉',background:'radial-gradient(ellipse at 14% 0%,#87436d 0%,transparent 55%),radial-gradient(ellipse at 92% 100%,#b56371 0%,transparent 58%),linear-gradient(160deg,#31182e,#5b294e 58%,#7b4266)',accent:'#ffd0cb',accent2:'#ffe1b1',glass:'rgba(255,235,229,.10)',glassB:'rgba(255,232,225,.23)',text:'#fff4f2',sub:'#eed1df',gold:'#ffe2a1',surface:'rgba(74,34,65,.94)',nav:'rgba(43,19,43,.60)',buttonA:'#ffb1bf',buttonB:'#ffc5c6',buttonC:'#ffdda9',buttonText:'#542744',palette:['255,201,202','255,222,177','255,180,219','255,246,237','235,193,255']},
 moon:{name:'月光银',background:'radial-gradient(ellipse at 15% 0%,#585271 0%,transparent 56%),radial-gradient(ellipse at 90% 100%,#65617e 0%,transparent 57%),linear-gradient(160deg,#171923,#313247 60%,#4a455f)',accent:'#e3d8ff',accent2:'#e3edff',glass:'rgba(236,235,255,.09)',glassB:'rgba(233,236,255,.23)',text:'#f7f5ff',sub:'#ccc9df',gold:'#f6e6bd',surface:'rgba(48,47,68,.95)',nav:'rgba(23,24,37,.64)',buttonA:'#d9caff',buttonB:'#dedcf6',buttonC:'#d9eaff',buttonText:'#333148',palette:['221,215,255','224,237,255','247,237,212','255,255,255','184,189,234']},
 ocean:{name:'深海蓝',background:'radial-gradient(ellipse at 12% 0%,#3569b5 0%,transparent 56%),radial-gradient(ellipse at 90% 100%,#5371b0 0%,transparent 55%),radial-gradient(ellipse at 80% 12%,#70528e 0%,transparent 40%),linear-gradient(160deg,#10264d,#234e80 60%,#346e9b)',accent:'#b5ecff',accent2:'#f2c4ef',glass:'rgba(216,244,255,.10)',glassB:'rgba(207,235,255,.24)',text:'#f0faff',sub:'#c3deed',gold:'#ffe4a9',surface:'rgba(28,63,104,.94)',nav:'rgba(13,35,64,.64)',buttonA:'#98ddff',buttonB:'#bddeff',buttonC:'#efbde9',buttonText:'#1b3d64',palette:['161,231,255','182,211,255','246,190,233','255,242,209','223,255,255']}
};
const MUSEUM_AVATAR_EMOJIS=['🦋','🌙','⭐','🌸','🐋','🦊','🐱','🌊','🍀','🎈'];

/* ---------- 基础 DOM / 字符串工具与状态 ---------- */
const $=id=>document.getElementById(id);
const val=id=>($(id)?$(id).value:'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hallOf=id=>S.halls.find(h=>h.id===id);
const hall=id=>hallOf(id)||S.halls[0]||DEFAULT_HALLS[1];
const hallLocked=h=>!!(h&&(h.secret||h.private));
const mood=id=>MOODS.find(m=>m.id===id);
const relOf=id=>RELS.find(r=>r.id===id)||RELS[RELS.length-1];
const fmtDate=d=>d?d.replace(/-/g,'.'):'';
const stat=(n,l)=>`<div class="stat glass"><b>${n}</b><span>${l}</span></div>`;
let S={version:2,profile:null,halls:[],exhibits:[],hiddenPrompts:[],customPrompts:[],lastBackup:0};
const UI={view:'setup',hall:null,visitor:false,tl:'all',hallType:'all',aw:null,awHall:'all',plist:[],query:'',searchType:'all',openStage:null,openTheme:null,pb:{}};
let ED={},CUR={imgs:[],i:0},SETUP_AV='🌙',MODAL_SOFT=true,USE_LS=false;

/* ---------- 存储：IndexedDB(lifeMuseum / kv / state)，失败时回退 localStorage(lifeMuseum) ---------- */
const DB={db:null,
 open(){return new Promise((res,rej)=>{const r=indexedDB.open('lifeMuseum',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
 get(k){return new Promise((res,rej)=>{const q=this.db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
 set(k,v){return new Promise((res,rej)=>{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}};
/* 写入降级时保留最新快照（_storageUpdatedAt），恢复后优先读取更新的一份。 */
async function save(){
 const previous=S._storageUpdatedAt;S._storageUpdatedAt=Date.now();
 try{
  if(USE_LS)localStorage.setItem('lifeMuseum',JSON.stringify(S));
  else{try{await DB.set('state',S)}catch(error){localStorage.setItem('lifeMuseum',JSON.stringify(S));USE_LS=true}}
  return true;
 }catch(error){if(previous===undefined)delete S._storageUpdatedAt;else S._storageUpdatedAt=previous;toast('⚠️ 保存失败，可能是存储空间不够了。请先导出备份。');return false}
}
async function loadMuseumState(){
 let indexed=null,local=null,idbReady=false;
 try{await DB.open();idbReady=true;indexed=await DB.get('state')}catch(error){USE_LS=true}
 try{const raw=localStorage.getItem('lifeMuseum');if(raw)local=JSON.parse(raw)}catch(error){}
 const valid=d=>d&&typeof d==='object'&&Array.isArray(d.exhibits);
 if(!valid(indexed))indexed=null;if(!valid(local))local=null;
 const localNewer=local&&(!indexed||(Number(local._storageUpdatedAt)||0)>(Number(indexed._storageUpdatedAt)||0));
 USE_LS=!idbReady;
 return {data:localNewer?local:indexed,recoveredLocal:!!(localNewer&&idbReady)};
}

/* ---------- 数据迁移：可重复运行，结果不变；保留所有未知字段 ---------- */
function migrate(data){
 const d=data&&typeof data==='object'&&!Array.isArray(data)?data:{},first=d.v22!==true;
 const copyHall=h=>({...h,g:Array.isArray(h.g)?[...h.g]:['#c3b1ff','#b69cff']});
 const halls=(Array.isArray(d.halls)&&d.halls.length?d.halls:DEFAULT_HALLS).filter(h=>h&&typeof h==='object').map(copyHall);
 if(!halls.length)halls.push(...DEFAULT_HALLS.map(copyHall));
 const missing=first?V22_STAGE_RULES.slice(5).filter(rule=>!halls.some(h=>h.id===rule.id)).map(rule=>({id:rule.id,name:rule.name,icon:rule.icon,desc:rule.desc,g:[...rule.g]})):[];
 const careerIndex=halls.findIndex(h=>h.id==='career');halls.splice(careerIndex<0?halls.length:careerIndex+1,0,...missing);
 const originalColors=new Map(DEFAULT_HALLS.map(h=>[h.id,h.g]));
 for(const h of halls){
  const rule=V22_STAGE_RULES.find(s=>s.id===h.id);
  if(rule){h.kind='stage';h.ageFrom=rule.ageFrom;h.ageTo=rule.ageTo}
  else h.kind='theme';
  if(d.theme==='blue'&&originalColors.has(h.id))h.g=[...originalColors.get(h.id)];
 }
 const ids=new Set(halls.map(h=>h.id)),stageIds=new Set(halls.filter(h=>h.kind==='stage').map(h=>h.id));
 const fallback=ids.has('childhood')?'childhood':halls[0].id;
 const exhibits=(Array.isArray(d.exhibits)?d.exhibits:[]).filter(e=>e&&typeof e==='object').map(original=>{
  const e={...original,links:Array.isArray(original.links)?[...original.links]:[],images:Array.isArray(original.images)?[...original.images]:[]};
  if(!ids.has(e.hall))e.hall=fallback;
  if(!e.type||!TYPES[e.type])e.type=e.hall==='travel'?'travel':'event';
  if(typeof e.date!=='string')e.date='';if(typeof e.endDate!=='string')e.endDate='';
  if(first||typeof e.river!=='boolean')e.river=stageIds.has(e.hall);
  const requested=typeof e.stage==='string'?e.stage:(typeof e.timelineStage==='string'?e.timelineStage:'');
  e.stage=stageIds.has(requested)?requested:'';
  return e;
 });
 const s={...d,version:2,v22:true,profile:d.profile&&typeof d.profile==='object'?{...d.profile}:null,halls,exhibits,
  hiddenPrompts:Array.isArray(d.hiddenPrompts)?[...d.hiddenPrompts]:[],
  customPrompts:Array.isArray(d.customPrompts)?d.customPrompts.map(p=>p&&typeof p==='object'?{...p}:p):[],
  lastBackup:d.lastBackup||0,
  ui:normalizeMuseumUI(d.ui)};
 delete s.theme;
 return s;
}
/* 3.0 数据底座：每次渲染前确保 framework / kids 存在，并把 version 标为 3 */
function ensureV3(){if(!S||typeof S!=='object')return;if(!Array.isArray(S.framework))S.framework=[];if(!Array.isArray(S.kids))S.kids=[];S.version=3}
