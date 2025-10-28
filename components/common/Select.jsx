import { StyleSheet, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { colors } from '@/constants/colorConstant'

const Select = ({ value, onValueChange, children, ...props }) => {
  return (
    <View style={styles.selectContainer}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={styles.picker}
        {...props}
      >
        {children}
      </Picker>
    </View>
  )
}

export default Select

const styles = StyleSheet.create({
  selectContainer: {
    borderWidth: 1,
    borderColor: colors.SUB1,
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 4,
    overflow: 'hidden',
    height: 40,
    justifyContent: 'center'
  },
  picker: {
    height: 50,
    marginTop: -6,
    fontSize: 12
  },
})