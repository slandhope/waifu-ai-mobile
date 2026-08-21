import TabScreenShell from '../components/TabScreenShell'
import WaifuStage from '../components/WaifuStage'

export default function HomeScreen({ onSettingsPress, onHabitsPress, wallpaper, profile, data }) {
  return (
    <TabScreenShell wallpaper={wallpaper}>
      <WaifuStage
        onSettingsPress={onSettingsPress}
        onHabitsPress={onHabitsPress}
        profile={profile}
        data={data}
      />
    </TabScreenShell>
  )
}
