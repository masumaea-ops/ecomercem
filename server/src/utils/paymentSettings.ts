import { AppDataSource } from '../config/database';
import { SystemSetting } from '../entities/SystemSetting';

export interface PaymentSettings {
    paybillNumber: string;
    paybillAccount: string;
    bankName: string;
    bankBranch: string;
    bankAccountNo: string;
    bankAccountName: string;
    instructions: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
    paybillNumber: '247247',
    paybillAccount: '0792506590',
    bankName: 'EQUITY BANK LTD',
    bankBranch: 'Karen Branch',
    bankAccountNo: '1250285737086',
    bankAccountName: 'Masuma Autoparts East Africa',
    instructions: 'Please use Quote / Order Number as payment reference.'
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
    try {
        const repo = AppDataSource.getRepository(SystemSetting);
        const settings = await repo.find();
        const map: Record<string, string> = {};
        for (const s of settings) {
            map[s.key] = s.value;
        }

        return {
            paybillNumber: map['PAYMENT_PAYBILL_NUMBER'] || DEFAULT_PAYMENT_SETTINGS.paybillNumber,
            paybillAccount: map['PAYMENT_PAYBILL_ACCOUNT'] || DEFAULT_PAYMENT_SETTINGS.paybillAccount,
            bankName: map['PAYMENT_BANK_NAME'] || DEFAULT_PAYMENT_SETTINGS.bankName,
            bankBranch: map['PAYMENT_BANK_BRANCH'] || DEFAULT_PAYMENT_SETTINGS.bankBranch,
            bankAccountNo: map['PAYMENT_BANK_ACCOUNT_NO'] || DEFAULT_PAYMENT_SETTINGS.bankAccountNo,
            bankAccountName: map['PAYMENT_BANK_ACCOUNT_NAME'] || DEFAULT_PAYMENT_SETTINGS.bankAccountName,
            instructions: map['PAYMENT_INSTRUCTIONS'] || DEFAULT_PAYMENT_SETTINGS.instructions,
        };
    } catch (err) {
        return DEFAULT_PAYMENT_SETTINGS;
    }
}
