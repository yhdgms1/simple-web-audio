const waitForInteraction = (() => {
  const { promise, resolve } = Promise.withResolvers<void>();
	
	const onUserInteraction = () => {
		resolve();
	};

	document.addEventListener('touchstart', onUserInteraction, { once: true });
	document.addEventListener('touchend', onUserInteraction, { once: true });
	document.addEventListener('click', onUserInteraction, { once: true });
	document.addEventListener('keydown', onUserInteraction, { once: true });

	return () => {
    return promise;
  };
})();

export { waitForInteraction }