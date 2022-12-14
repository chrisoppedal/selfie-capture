import React from 'react';
import { Text, Box, Loader } from '@pingux/astro';

const Loading = () => {

  return (
    <Box
      height="100vh"
      width="100%"
      sx={{
        zIndex: '1',
      }}
    >
      <Box my="auto">
        <Box>
          <Loader
            color="active"
            mx="auto"
          />
        </Box>
        <Text
          mt="xl"
          mx="auto"
          className="body-text"
          variant="sectionTitle"
          mb="md"
        >
          Loading
        </Text>
      </Box>
    </Box>
  );
};

export default Loading;