package dev.sim0n.app.test.factory;

import dev.sim0n.app.test.TestRepository;
import java.util.function.Function;

public class PartitioningTestRepositoryFactory implements TestRepositoryFactory {
    private final Function<Object, TestRepository> func;

    public PartitioningTestRepositoryFactory(Function<Object, TestRepository> func) {
        this.func = func;
    }

    public TestRepository build() {
        return this.func.apply(() -> System.out.println("Building test repository"));
    }
}