import TabScreenShell from '../components/TabScreenShell'
import WaifuStage from '../components/WaifuStage'

export default function HomeScreen({ onSettingsPress, wallpaper, profile, data }) {
  return (
    <TabScreenShell wallpaper={wallpaper}>
      <WaifuStage
        onSettingsPress={onSettingsPress}
        profile={profile}
        data={data}
      />
    </TabScreenShell>
  )
}
