package dev.sim0n.app.test.factory;

import dev.sim0n.app.test.TestRepository;

public enum SimpleTestRepositoryFactory implements TestRepositoryFactory {
  INSTANCE;

  private final TestRepositoryFactory innerTestRepositoryFactory;

  private SimpleTestRepositoryFactory() {
    this.innerTestRepositoryFactory = new PartitioningTestRepositoryFactory(TestRepository::new);
  }

  @Override
  public TestRepository build() {
    return this.innerTestRepositoryFactory.build();
  }
}
