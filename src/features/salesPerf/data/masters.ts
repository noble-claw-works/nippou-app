// =====================================================
// salesPerf/data/masters.ts — 架空マスタデータ
// =====================================================
import type { SalesPerfMasters } from '../types';

export const SALES_PERF_MASTERS: SalesPerfMasters = {
  users: [
    { id: 'sp_u1', name: '霧島 遥',   groupId: 'sp_g1', role: 'general' },
    { id: 'sp_u2', name: '佐倉 涼',   groupId: 'sp_g1', role: 'general' },
    { id: 'sp_u3', name: '東雲 蓮',   groupId: 'sp_g1', role: 'general' },
    { id: 'sp_u4', name: '天音 結衣', groupId: 'sp_g2', role: 'general' },
    { id: 'sp_u5', name: '桐生 玲',   groupId: 'sp_g2', role: 'general' },
    { id: 'sp_u6', name: '白鳥 岬',   groupId: 'sp_gm', role: 'manager' },
    { id: 'sp_u7', name: '藤宮 樹',   groupId: 'sp_gm', role: 'admin'   },
  ],
  groups: [
    {
      id: 'sp_g1',
      name: '第一営業G',
      memberIds: ['sp_u1', 'sp_u2', 'sp_u3'],
      managerIds: ['sp_u6'],
    },
    {
      id: 'sp_g2',
      name: '第二営業G',
      memberIds: ['sp_u4', 'sp_u5'],
      managerIds: ['sp_u6'],
    },
    {
      id: 'sp_gm',
      name: '管理',
      memberIds: ['sp_u6', 'sp_u7'],
      managerIds: ['sp_u7'],
    },
  ],
  insurers: [
    { id: 'ins_1',  name: '第一生命',         line: 'life'    },
    { id: 'ins_2',  name: '日本生命',         line: 'life'    },
    { id: 'ins_3',  name: '明治安田生命',     line: 'life'    },
    { id: 'ins_4',  name: '住友生命',         line: 'life'    },
    { id: 'ins_5',  name: '東京海上日動',     line: 'nonlife' },
    { id: 'ins_6',  name: '損保ジャパン',     line: 'nonlife' },
    { id: 'ins_7',  name: 'あいおいニッセイ', line: 'nonlife' },
    { id: 'ins_8',  name: 'MS&AD',            line: 'nonlife' },
    { id: 'ins_9',  name: 'メットライフ生命', line: 'life'    },
    { id: 'ins_10', name: 'アフラック',       line: 'life'    },
    { id: 'ins_11', name: 'チューリッヒ',     line: 'both'    },
  ],
  productTypes: [
    { id: 'pt_1',  name: '終身保険',     line: 'life'    },
    { id: 'pt_2',  name: '定期保険',     line: 'life'    },
    { id: 'pt_3',  name: '医療保険',     line: 'life'    },
    { id: 'pt_4',  name: 'がん保険',     line: 'life'    },
    { id: 'pt_5',  name: '個人年金',     line: 'life'    },
    { id: 'pt_6',  name: '変額保険',     line: 'life'    },
    { id: 'pt_7',  name: '自動車保険',   line: 'nonlife' },
    { id: 'pt_8',  name: '火災保険',     line: 'nonlife' },
    { id: 'pt_9',  name: '傷害保険',     line: 'nonlife' },
    { id: 'pt_10', name: '賠償責任保険', line: 'nonlife' },
    { id: 'pt_11', name: '企業総合',     line: 'nonlife' },
    { id: 'pt_12', name: '所得補償',     line: 'nonlife' },
  ],
  channels: [
    { id: 'ch_1', name: '紹介'         },
    { id: 'ch_2', name: '飛込'         },
    { id: 'ch_3', name: '提携先経由'   },
    { id: 'ch_4', name: '既存顧客深耕' },
    { id: 'ch_5', name: 'DM反響'       },
    { id: 'ch_6', name: 'セミナー'     },
    { id: 'ch_7', name: 'SNS'          },
  ],
};
