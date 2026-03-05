package dev.sim0n.app.test.factory;

import dev.sim0n.app.test.TestRepository;
import dev.sim0n.app.test.factory.PartitioningTestRepositoryFactory;
import dev.sim0n.app.test.factory.TestRepositoryFactory;

public enum SimpleTestRepositoryFactory implements TestRepositoryFactory {
  INSTANCE;

  private final TestRepositoryFactory innerTestRepositoryFactory =
      new PartitioningTestRepositoryFactory(TestRepository::new);

  @Override
  public TestRepository build() {
    return this.innerTestRepositoryFactory.build();
  }
}
