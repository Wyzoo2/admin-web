import { useMemo } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './store/theme';

const App: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  // AntD 主题令牌：浅色走 Notion 温润白，深色走 Linear 深炭；主色统一为当前前景色
  const themeConfig = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: isDark ? '#ffffff' : '#111111',
        colorInfo: isDark ? '#ffffff' : '#111111',
        colorLink: isDark ? '#ffffff' : '#111111',
        colorBgLayout: isDark ? '#08080a' : '#fbfbfa',
        colorBgContainer: isDark ? '#121214' : '#ffffff',
        colorBgElevated: isDark ? '#18181b' : '#ffffff',
        colorBorder: isDark ? '#262629' : '#ebebe9',
        colorBorderSecondary: isDark ? '#1f1f22' : '#f0f0ee',
        colorText: isDark ? '#f5f5f7' : '#1a1a1a',
        colorTextSecondary: isDark ? '#a1a1a6' : '#787774',
        colorTextTertiary: isDark ? '#6e6e73' : '#9b9a97',
        // 深色下主色是白色，按钮/选中态等"实心白底"上的文字必须为深色才看得清
        colorTextLightSolid: isDark ? '#08080a' : '#ffffff',
        borderRadius: 8,
        fontFamily:
          '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", system-ui, -apple-system, sans-serif',
      },
      components: {
        Menu: {
          itemSelectedBg: isDark ? '#232326' : '#eeeeec',
          itemSelectedColor: isDark ? '#ffffff' : '#111111',
          itemActiveBg: isDark ? '#1c1c1f' : '#f1f1ef',
          itemHoverBg: isDark ? '#1c1c1f' : '#f1f1ef',
          itemHoverColor: isDark ? '#ffffff' : '#1a1a1a',
          itemBorderRadius: 8,
          itemColor: isDark ? '#b8b8be' : '#5f5e5b',
          groupTitleColor: isDark ? '#787774' : '#9b9a97',
          iconSize: 16,
          iconMarginInlineEnd: 10,
        },
        Table: {
          headerBg: isDark ? '#0f0f11' : '#f7f7f5',
          headerColor: isDark ? '#a1a1a6' : '#787774',
          rowHoverBg: isDark ? '#1c1c1f' : '#f1f1ef',
          borderColor: isDark ? '#262629' : '#ebebe9',
        },
        Card: { paddingLG: 20 },
        Modal: { contentBg: isDark ? '#121214' : '#ffffff' },
        Drawer: {
          colorBgElevated: isDark ? '#121214' : '#ffffff',
        },
      },
    }),
    [isDark],
  );

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
