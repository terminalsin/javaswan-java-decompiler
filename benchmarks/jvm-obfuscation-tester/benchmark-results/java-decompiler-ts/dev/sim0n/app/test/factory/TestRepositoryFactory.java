package dev.sim0n.app.test.factory;

import dev.sim0n.app.test.TestRepository;

public interface TestRepositoryFactory {
  abstract TestRepository build();
}
