// ReviewSpy AI - Lemon Squeezy License & Usage Counter Validator
export class LicenseManager {
  static FREE_TIER_LIMIT = 3;

  static async getUsage() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const data = await chrome.storage.local.get(['usageMonth', 'usageCount', 'licenseKey', 'isPro', 'lastVerified']);

    if (data.usageMonth !== currentMonth) {
      // New month: reset monthly free counter
      await chrome.storage.local.set({ usageMonth: currentMonth, usageCount: 0 });
      return { count: 0, limit: LicenseManager.FREE_TIER_LIMIT, isPro: !!data.isPro };
    }

    return {
      count: data.usageCount || 0,
      limit: LicenseManager.FREE_TIER_LIMIT,
      isPro: !!data.isPro
    };
  }

  static async incrementUsage() {
    const { count, isPro } = await LicenseManager.getUsage();
    if (!isPro) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await chrome.storage.local.set({
        usageMonth: currentMonth,
        usageCount: count + 1
      });
    }
  }

  static async canAnalyze() {
    const { count, limit, isPro } = await LicenseManager.getUsage();
    if (isPro) return { allowed: true, isPro: true };
    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      isPro: false
    };
  }

  static async validateLemonSqueezyLicense(licenseKey) {
    if (!licenseKey || !licenseKey.trim()) {
      throw new Error('Please enter a valid license key.');
    }

    try {
      const params = new URLSearchParams();
      params.append('license_key', licenseKey.trim());

      const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const json = await res.json();

      if (json.valid === true) {
        await chrome.storage.local.set({
          licenseKey: licenseKey.trim(),
          isPro: true,
          lastVerified: Date.now()
        });
        return { success: true, customerEmail: json.meta?.customer_email || 'Active Subscriber' };
      } else {
        await chrome.storage.local.set({ isPro: false });
        return { success: false, error: json.error || 'Invalid or expired license key.' };
      }
    } catch (e) {
      // In case user is offline, check if recently verified (within 7 days grace period)
      const data = await chrome.storage.local.get(['isPro', 'lastVerified', 'licenseKey']);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (data.isPro && data.lastVerified && (Date.now() - data.lastVerified < sevenDays)) {
        return { success: true, customerEmail: 'Active (Offline Grace Period)' };
      }
      throw new Error('Failed to reach validation server. Please check your internet connection.');
    }
  }

  static async deactivateLicense() {
    await chrome.storage.local.remove(['licenseKey', 'isPro', 'lastVerified']);
  }
}
