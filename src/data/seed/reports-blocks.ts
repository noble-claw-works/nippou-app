// =====================================================
// シードデータ — 日報ブロック (TimeBlock) ヘルパー
// =====================================================
import type { TimeBlock } from "../../types";
import {
  _lastWeekday,
  _oarDate2,
  _oarDate3,
  _recentWeekdays,
  makeBlock,
} from "./helpers";

export function getExtraBlocks(date: string, rid: string): TimeBlock[] {
  if (date === _lastWeekday) {
    // oar_demo_opp1: GILSON家 生命保険見直し（設計書説明）
    return [
      makeBlock(`b_${rid}_opp_report`, rid, {
        type: "visit",
        startTime: "14:00",
        endTime: "15:00",
        title: "GILSON家 生命保険見直し: 設計書説明・質問対応",
        customerId: "c1",
        opportunityId: "opp1",
        memo: "設計書の詳細を説明。お客様より「配偶者分も検討したい」とのご意向。次回面談で配偶者用設計書を提出予定。",
        isPlanned: false,
        isActual: true,
        sourceReportId: "oar_demo_opp1",
      }),
    ];
  }
  if (date === _oarDate2) {
    // oar_demo_opp2: 齋藤家 医療保険（告知書・奥様同席確認）+ opp5 高橋家 証券確認電話
    return [
      makeBlock(`b_${rid}_opp_report2`, rid, {
        type: "phone",
        startTime: "16:00",
        endTime: "16:30",
        title: "齋藤家 医療保険: 告知書確認・奥様同席日程調整",
        customerId: "c2",
        opportunityId: "opp2",
        memo: "告知書の未記入箇所（貧血歴）について電話確認。主治医への問い合わせを依頼。奥様同席の面談日程を来週に調整中。",
        isPlanned: false,
        isActual: true,
        sourceReportId: "oar_demo_opp2",
      }),
      makeBlock(`b_${rid}_opp5`, rid, {
        type: "phone",
        startTime: "17:00",
        endTime: "17:30",
        title: "高橋家 自動車保険: 現行保険証券確認・更新タイミングヒアリング",
        customerId: "c8",
        opportunityId: "opp5",
        memo: "証券内容を電話で確認。年中更新のため今から検討開始。次回面談の日程を調整中。",
        isPlanned: false,
        isActual: true,
      }),
    ];
  }
  if (date === _oarDate3) {
    // oar_demo_opp3: 水野家 自動車保険（申込書案内・特約説明）+ opp10 鈴木学資 + opp11 水野生命
    return [
      makeBlock(`b_${rid}_opp_report3`, rid, {
        type: "phone",
        startTime: "10:30",
        endTime: "11:00",
        title: "水野家 自動車保険 更新: 申込書記入案内・弁護士費用特約説明",
        customerId: "c4",
        opportunityId: "opp3",
        memo: "申込書の記入方法を電話でご案内。今週中に書類を持参いただける見込み。弁護士費用特約の追加説明も実施。申込確度はS。",
        isPlanned: false,
        isActual: true,
        sourceReportId: "oar_demo_opp3",
      }),
      makeBlock(`b_${rid}_opp10`, rid, {
        type: "visit",
        startTime: "13:00",
        endTime: "14:00",
        title: "鈴木家 学資保険: 学費計画ヒアリング",
        customerId: "c6",
        opportunityId: "opp10",
        memo: "子供3人の学費計画についてヒアリング。学資ねるきんの暫定見積もりを説明し温かい反応。",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_opp11`, rid, {
        type: "phone",
        startTime: "16:00",
        endTime: "16:30",
        title: "水野家 生命保険: 初回アポ確認電話",
        customerId: "c4",
        opportunityId: "opp11",
        memo: "自動車保険更新時に生命保険の興味を示されたため面談のアポを持ちかけ。日程調整中。",
        isPlanned: false,
        isActual: true,
      }),
    ];
  }
  // opp4: 鈴木家 生命保険—初回面談
  if (date === _recentWeekdays[1]) {
    return [
      makeBlock(`b_${rid}_opp4`, rid, {
        type: "visit",
        startTime: "10:00",
        endTime: "11:30",
        title: "鈴木家 生命保険: 初回面談・家族構成ヒアリング",
        customerId: "c6",
        opportunityId: "opp4",
        memo: "紹介さらに初回面談。子供3人分の保障内容を確認。暫定見積もりを提示し前向きな反応。",
        isPlanned: true,
        isActual: true,
      }),
    ];
  }
  // opp7+opp8+opp_demo1: 受注・失注・複合提案の活動履歴
  if (date === _recentWeekdays[4]) {
    return [
      makeBlock(`b_${rid}_opp7`, rid, {
        type: "visit",
        startTime: "10:00",
        endTime: "11:00",
        title: "GILSON家 自動車保険 受注後フォロー: 証券確認",
        customerId: "c1",
        opportunityId: "opp7",
        memo: "証券発行後の内容確認訪問。次回更新が楽しみというお言葉をいただいた。",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_opp8`, rid, {
        type: "phone",
        startTime: "14:00",
        endTime: "14:30",
        title: "齋藤家 生命保険 (失注): 最終フォロー電話",
        customerId: "c2",
        opportunityId: "opp8",
        memo: "失注の確認電話。他社に決まったことを確認。今後の別の案件の投購をお願いするとお伝えした。",
        isPlanned: false,
        isActual: true,
      }),
      makeBlock(`b_${rid}_opp_demo1`, rid, {
        type: "visit",
        startTime: "15:30",
        endTime: "17:00",
        title: "松本家 総合保険 見直し: 申込書類 確認・回収",
        customerId: "c_demo1",
        opportunityId: "opp_demo1",
        memo: "生命保険の申込書類を回収。医療・自動車は配偶者相談待ち。",
        isPlanned: true,
        isActual: true,
      }),
    ];
  }
  return [];
}

export function getBaseBlocks(date: string, rid: string): TimeBlock[] {
  if (date === _oarDate2) {
    // 齋藤家フォロー日: 午前訪問+昼食+見積+夕方電話（商談報告はextraBlocksで16:00-16:30）
    return [
      makeBlock(`b_${rid}_1`, rid, {
        type: "meeting",
        startTime: "09:00",
        endTime: "09:30",
        title: "朝礼・案件共有",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_2`, rid, {
        type: "visit",
        startTime: "10:00",
        endTime: "11:30",
        title: "GILSON家フォロー訪問: 追加設計書準備状況の確認",
        customerId: "c1",
        opportunityId: "opp1",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_3`, rid, {
        type: "lunch",
        startTime: "12:00",
        endTime: "13:00",
        title: "昼食",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_4`, rid, {
        type: "office",
        startTime: "13:00",
        endTime: "16:00",
        title: "設計書作成・見積書修正（配偶者分）",
        isPlanned: true,
        isActual: true,
      }),
      // extraBlocks: 16:00-16:30 齋藤家電話（oar_demo_opp2）
      makeBlock(`b_${rid}_5`, rid, {
        type: "office",
        startTime: "16:30",
        endTime: "17:30",
        title: "翌日訪問準備・申込書セット",
        isPlanned: true,
        isActual: true,
      }),
    ];
  }
  if (date === _oarDate3) {
    // 水野家電話対応日: 午前電話（商談報告10:30-11:00）+訪問+午後事務
    return [
      makeBlock(`b_${rid}_1`, rid, {
        type: "meeting",
        startTime: "09:00",
        endTime: "09:30",
        title: "朝礼",
        isPlanned: true,
        isActual: true,
      }),
      // extraBlocks: 10:30-11:00 水野家電話（oar_demo_opp3）
      makeBlock(`b_${rid}_2`, rid, {
        type: "visit",
        startTime: "11:30",
        endTime: "12:30",
        title: "暁和化学ゴム 火災保険 査定立会い",
        customerId: "c3",
        opportunityId: "opp9",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_3`, rid, {
        type: "lunch",
        startTime: "12:30",
        endTime: "13:30",
        title: "昼食",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_4`, rid, {
        type: "office",
        startTime: "13:30",
        endTime: "15:30",
        title: "査定結果まとめ・申込書チェック",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock(`b_${rid}_5`, rid, {
        type: "visit",
        startTime: "15:30",
        endTime: "17:00",
        title: "伊藤家 医療保険 ニーズヒアリング",
        customerId: "c10",
        opportunityId: "opp6",
        isPlanned: true,
        isActual: true,
      }),
    ];
  }
  // 通常日報（既存）
  return [
    makeBlock(`b_${rid}_1`, rid, {
      type: "meeting",
      startTime: "09:00",
      endTime: "09:30",
      title: "朝礼",
    }),
    makeBlock(`b_${rid}_2`, rid, {
      type: "visit",
      startTime: "10:00",
      endTime: "11:00",
      title: "顧客訪問",
      customerId: "c1",
    }),
    makeBlock(`b_${rid}_3`, rid, {
      type: "lunch",
      startTime: "12:00",
      endTime: "13:00",
      title: "昼食",
    }),
    makeBlock(`b_${rid}_4`, rid, {
      type: "office",
      startTime: "14:00",
      endTime: "17:00",
      title: "事務作業",
    }),
  ];
}
