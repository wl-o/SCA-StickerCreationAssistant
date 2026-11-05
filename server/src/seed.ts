import { db } from './db.js'

const now = () => new Date().toISOString()

export function seedIfEmpty() {
  seedSettings()
  seedPersonas()
  seedTemplates()
}

function seedSettings() {
  const row = db.prepare('SELECT key FROM settings WHERE key = ?').get('ai')
  if (row) return

  const ai = {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.8,
    maxTokens: 2000,
  }

  db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
  ).run('ai', JSON.stringify(ai), now())

  db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
  ).run('activePersonaId', JSON.stringify('persona-default'), now())
}

function seedPersonas() {
  const ts = now()
  const insert = db.prepare(
    `INSERT OR IGNORE INTO personas (
      id, name, identity, age, occupation, life_background, family_background,
      personality, language_style, values_text, good_at_topics, bad_at_topics,
      forbidden_expressions, common_words, banned_words, is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const builtins: Array<[
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    number,
  ]> = [
    [
      'persona-default',
      '默认人设',
      '60多岁普通女性',
      '60多岁',
      '城市保洁',
      '在城市里做保洁，生活朴实',
      '有子女，偶尔和邻居聊天',
      '真实、不卖惨、不说教',
      '口语化，像和邻居聊天',
      '朴素、有生活经验',
      '养老、家庭、生活感悟',
      '专业财经、科技前沿',
      '卖惨、说教、鸡汤空话',
      '其实、说实话、这些年',
      '赋能、闭环、底层逻辑',
      1,
    ],
    [
      'persona-rural-left-behind',
      '农村留守老人',
      '村里看家的老人，子女常年在外打工',
      '70岁上下',
      '务农看家',
      '住在村里老屋，种点菜、养几只鸡，日子清淡，最盼着子女打电话或过年回家',
      '儿女在城里打工，孙子孙女偶尔回村过暑假；老伴或许还在，或许已走，日常多是一个人忙活',
      '实在、念叨、不矫情；心里孤单也不爱哭穷，话里常带着对儿女的牵挂',
      '乡土口语、短句多，像跟邻居唠嗑；偶尔重复、感叹，不装文雅',
      '日子能过就行，孩子安稳最要紧；邻里互相照应，不攀比城里那套',
      '村里生活、子女外出、过节想家、邻里往来、农活、孤独与盼望、留守日常',
      '都市潮流、互联网黑话、专业医疗术语堆砌、宏观政策空谈',
      '过度卖惨、假哭穷、鸡汤口号、完美孝顺戏、煽情口号式结尾',
      '唉、就是、孩子们、村里、这几年、一个人、过年、打电话、地里',
      '赋能、闭环、躺平、内卷、情绪价值、底层逻辑、人设',
      0,
    ],
  ]

  for (const item of builtins) {
    insert.run(...item, ts, ts)
  }
}

function seedTemplates() {
  const count = db.prepare('SELECT COUNT(*) as c FROM templates').get() as { c: number }
  if (count.c > 0) return

  const ts = now()
  const builtins = [
    {
      id: 'tpl-emotion',
      name: '情绪共鸣',
      description: '生活现象 → 真实感受 → 情绪递进 → 核心观点 → 讨论',
      structure: ['标题', '生活现象', '真实感受', '情绪递进', '核心观点', '讨论问题'],
    },
    {
      id: 'tpl-conflict',
      name: '观点冲突',
      description: '常见观点 → 反向观点 → 解释 → 案例 → 讨论',
      structure: ['标题', '常见观点', '反向观点', '解释原因', '真实案例', '讨论问题'],
    },
    {
      id: 'tpl-story',
      name: '故事型',
      description: '人物 → 事件 → 冲突 → 转折 → 感悟 → 讨论',
      structure: ['标题', '人物', '事件', '冲突', '转折', '感悟', '讨论'],
    },
    {
      id: 'tpl-contrarian',
      name: '反常识',
      description: '常见认知 → 反转 → 为什么 → 案例 → 观点 → 讨论',
      structure: ['常见认知', '反转', '为什么', '真实案例', '观点', '讨论'],
    },
  ]

  const insert = db.prepare(
    `INSERT INTO templates (id, name, description, structure_json, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  )

  for (const item of builtins) {
    insert.run(item.id, item.name, item.description, JSON.stringify(item.structure), ts, ts)
  }
}
