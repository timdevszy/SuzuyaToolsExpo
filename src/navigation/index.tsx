import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image, View } from 'react-native';
import bell from '../assets/bell.png';
import newspaper from '../assets/newspaper.png';
import tag from '../assets/tag.png';
import { useDiscount } from '../modules/discount/state/DiscountContext';
import { useAuth } from '../auth/AuthContext';
import { Login } from './screens/Auth/Login';
import { Register } from './screens/Auth/Register';
import { Home } from './screens/Home/Home';
import { Profile } from './screens/Profile/Profile';
import { Settings } from './screens/Settings/Settings';
import { Updates } from './screens/Updates/Updates';
import { AdjustPrinter } from '../modules/discount/screens/AdjustPrinterScreen';
import { ScanProduct } from '../modules/discount/screens/ScanProductScreen';
import { Discount } from '../modules/discount/screens/DiscountScreen';
import { NotFound } from './screens/NotFound/NotFound';

function OutletHeaderRight() {
  const { defaultOutlet } = useAuth();
  const outletCode = defaultOutlet || '—';

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#e5f0ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#22c55e',
          marginRight: 6,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: '#1d4ed8',
        }}
      >
        {String(outletCode)}
      </Text>
    </View>
  );
}

function DiscountHeaderRight() {
  const { scans } = useDiscount();
  const count = scans.length;
  const showPrintAll = count > 1;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <OutletHeaderRight />
    </View>
  );
}

const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        title: 'Feed',
        tabBarIcon: ({ color, size }) => (
          <Image
            source={newspaper}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Updates: {
      screen: Updates,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={bell}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Discount: {
      screen: Discount,
      options: {
        title: 'Discount',
        tabBarIcon: ({ color, size }) => (
          <Text
            style={{
              color,
              fontSize: size * 0.9,
              fontWeight: '700',
            }}
          >
            %
          </Text>
        ),
        headerRight: () => <DiscountHeaderRight />,
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Login',
  screens: {
    Login: {
      screen: Login,
      options: {
        title: 'Login',
      },
    },
    Register: {
      screen: Register,
      options: {
        title: 'Register',
      },
    },
    HomeTabs: {
      screen: HomeTabs,
      options: {
        title: 'Home',
        headerShown: false,
      },
    },
    Profile: {
      screen: Profile,
      linking: {
        path: ':user(@[a-zA-Z0-9-_]+)',
        parse: {
          user: (value) => value.replace(/^@/, ''),
        },
        stringify: {
          user: (value) => `@${value}`,
        },
      },
    },
    Settings: {
      screen: Settings,
      options: ({ navigation }) => ({
        presentation: 'modal',
        headerRight: () => (
          <HeaderButton onPress={navigation.goBack}>
            <Text>Close</Text>
          </HeaderButton>
        ),
      }),
    },
    AdjustPrinter: {
      screen: AdjustPrinter,
      options: {
        title: 'Adjust Printer',
      },
    },
    ScanProduct: {
      screen: ScanProduct,
      options: {
        title: 'Scan Product',
        headerRight: () => <OutletHeaderRight />,
      },
    },
    NotFound: {
      screen: NotFound,
      options: {
        title: '404',
      },
      linking: {
        path: '*',
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
