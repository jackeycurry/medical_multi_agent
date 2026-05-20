import type { ThemeConfig } from 'antd';

export const brand = {
  primary: '#00C896',
  primaryHover: '#00B287',
  primaryActive: '#009E78',
  primarySoft: '#E6FAF4',
  primaryGradient: 'linear-gradient(135deg, #00C896 0%, #00A8FF 100%)',

  bgLayout: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgSider: '#0F172A',
  bgSiderActive: 'rgba(0, 200, 150, 0.12)',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  success: '#00C896',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  shadowCard: '0 2px 8px rgba(15, 23, 42, 0.06)',
  shadowHover: '0 8px 24px rgba(15, 23, 42, 0.10)',

  fontFamily:
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
};

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorSuccess: brand.success,
    colorWarning: brand.warning,
    colorError: brand.danger,
    colorInfo: brand.info,
    colorBgLayout: brand.bgLayout,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: brand.fontFamily,
    fontSize: 14,
    colorText: brand.text,
    colorTextSecondary: brand.textSecondary,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      bodyBg: brand.bgLayout,
      siderBg: brand.bgSider,
      headerHeight: 60,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: brand.shadowCard,
      paddingLG: 20,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 44,
    },
    Menu: {
      darkItemBg: brand.bgSider,
      darkSubMenuItemBg: brand.bgSider,
      darkItemSelectedBg: brand.bgSiderActive,
      darkItemSelectedColor: brand.primary,
      darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Table: {
      headerBg: '#FAFBFC',
      headerColor: brand.textSecondary,
      borderColor: '#F0F2F5',
    },
    Tabs: {
      itemActiveColor: brand.primary,
      inkBarColor: brand.primary,
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },
  },
};
