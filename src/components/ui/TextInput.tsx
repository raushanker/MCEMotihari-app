import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  const handleChangeText = (text: string) => {
    let modifiedText = text;
    // Programmatically capitalize the first letter of sentences if autoCapitalize is sentences
    if (props.autoCapitalize === 'sentences' && text.length > 0) {
      modifiedText = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, sep, char) => sep + char.toUpperCase());
    }
    
    if (props.onChangeText) {
      props.onChangeText(modifiedText);
    }
  };

  return (
    <RNTextInput 
      {...props} 
      ref={ref} 
      onChangeText={props.onChangeText ? handleChangeText : undefined} 
    />
  );
});

TextInput.displayName = 'TextInput';
