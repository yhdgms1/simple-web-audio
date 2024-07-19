const waitForInteraction = (() => {
  const { promise, resolve } = Promise.withResolvers<void>();
	
	const onUserInteraction = () => {
		resolve();
	};

	document.addEventListener('pointerdown', onUserInteraction, { once: true });
	document.addEventListener('pointerup', onUserInteraction, { once: true });

	return () => {
    return promise;
  };
})();

export { waitForInteraction }